/* eslint-disable @typescript-eslint/no-this-alias */
import { Network as NetworkModule } from '@internxt/sdk';
import { downloadFile } from '@internxt/sdk/dist/network/download';
import { uploadFile, uploadMultipartFile } from '@internxt/sdk/dist/network/upload';
import { validateMnemonic } from 'bip39';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

import { EncryptFileFunction, UploadFileMultipartFunction } from '@internxt/sdk/dist/network';
import envService from 'app/core/services/env.service';
import { buildProgressStream, decryptStream } from 'app/core/services/stream.service';
import { queue, QueueObject } from 'async';

import { waitForContinueUploadSignal } from '../drive/services/worker.service/uploadWorkerUtils';
import { TaskStatus } from '../tasks/types';
import { encryptStreamInParts, generateFileKey, getEncryptedFile, processEveryFileBlobReturnHash } from './crypto';
import { DownloadProgressCallback, getDecryptedStream } from './download';
import { uploadFileUint8Array, UploadProgressCallback } from './upload-utils';
import { UPLOAD_CHUNK_SIZE, ALLOWED_CHUNK_OVERHEAD } from './networkConstants';
import { WORKER_MESSAGE_STATES } from 'app/drive/services/worker.service/types/upload';
import { NetworkUtils } from 'app/utils/networkUtils';

interface UploadOptions {
  uploadingCallback: UploadProgressCallback;
  abortController?: AbortController;
  continueUploadOptions?: {
    taskId: string;
    isPaused: boolean;
  };
}

interface UploadMultipartOptions extends UploadOptions {
  parts: number;
}

interface DownloadOptions {
  key?: Buffer;
  token?: string;
  abortController?: AbortController;
  downloadingCallback?: DownloadProgressCallback;
}

interface UploadTask {
  contentToUpload: Uint8Array;
  urlToUpload: string;
  index: number;
}

export interface DownloadChunkTask {
  index: number;
  chunkStart: number;
  chunkEnd: number;
  attempt: number;
  maxRetries: number;
}

/**
 * The entry point for interacting with the network
 */
export class NetworkFacade {
  private readonly cryptoLib: NetworkModule.Crypto;
  private isPaused: boolean;

  constructor(private readonly network: NetworkModule.Network) {
    this.isPaused = false;

    this.cryptoLib = {
      algorithm: NetworkModule.ALGORITHMS.AES256CTR,
      validateMnemonic: (mnemonic) => {
        return validateMnemonic(mnemonic);
      },
      generateFileKey: (mnemonic, bucketId, index) => {
        return generateFileKey(mnemonic, bucketId, index as Buffer);
      },
      randomBytes,
    };
  }

  destroy() {
    removeEventListener('message', this.handleWorkerMessage);
  }

  private handleWorkerMessage = (msg) => {
    if (msg.data.result === WORKER_MESSAGE_STATES.UPLOAD_STATUS) {
      this.isPaused = msg.data.uploadStatus.status === TaskStatus.Paused;
    }
  };

  upload(bucketId: string, mnemonic: string, file: File, options: UploadOptions): Promise<string> {
    let fileToUpload: Uint8Array;
    let fileHash: string;

    return uploadFile(
      this.network,
      this.cryptoLib,
      bucketId,
      mnemonic,
      file.size,
      async (algorithm, key, iv) => {
        const cipher = createCipheriv('aes-256-ctr', key as Buffer, iv as Buffer);
        const [encryptedFile, hash] = await getEncryptedFile(file, cipher, file.size);

        fileToUpload = encryptedFile;
        fileHash = hash;
      },
      async (url: string) => {
        const useProxy =
          envService.getVariable('dontUseProxy') !== 'true' && !new URL(url).hostname.includes('internxt');
        const fetchUrl = (useProxy ? envService.getVariable('proxy') + '/' : '') + url;
        const isPaused = options.continueUploadOptions?.isPaused;

        postMessage({ result: WORKER_MESSAGE_STATES.CHECK_UPLOAD_STATUS });
        if (isPaused && options?.continueUploadOptions?.taskId)
          await waitForContinueUploadSignal(options?.continueUploadOptions?.taskId);

        await uploadFileUint8Array(fileToUpload, fetchUrl, {
          progressCallback: options.uploadingCallback,
          abortController: options.abortController,
        });

        /**
         * TODO: Memory leak here, probably due to closures usage with this variable.
         * Pending to be solved, do not remove this line unless the leak is solved.
         */
        fileToUpload = new Uint8Array();

        return fileHash;
      },
    );
  }

  uploadMultipart(bucketId: string, mnemonic: string, file: File, options: UploadMultipartOptions): Promise<string> {
    const partsUploadedBytes: Record<number, number> = {};

    function notifyProgress(partId: number, uploadedBytes: number) {
      partsUploadedBytes[partId] = uploadedBytes;

      options.uploadingCallback(
        file.size,
        Object.values(partsUploadedBytes).reduce((a, p) => a + p, 0),
      );
    }

    const uploadsAbortController = new AbortController();
    options.abortController?.signal.addEventListener('abort', () => uploadsAbortController.abort());

    let realError: Error | null = null;
    let fileReadable: ReadableStream<Uint8Array>;
    const fileParts: { PartNumber: number; ETag: string }[] = [];

    const encryptFile: EncryptFileFunction = async (algorithm, key, iv) => {
      const cipher = createCipheriv('aes-256-ctr', key as Buffer, iv as Buffer);
      fileReadable = encryptStreamInParts(file, cipher, UPLOAD_CHUNK_SIZE, ALLOWED_CHUNK_OVERHEAD);
    };

    addEventListener('message', this.handleWorkerMessage);

    const uploadFileMultipart: UploadFileMultipartFunction = async (urls: string[]) => {
      let partIndex = 0;
      const limitConcurrency = 6;

      const worker = async (upload: UploadTask) => {
        postMessage({ result: WORKER_MESSAGE_STATES.CHECK_UPLOAD_STATUS });
        if (this.isPaused && options?.continueUploadOptions?.taskId) {
          await waitForContinueUploadSignal(options.continueUploadOptions.taskId);
        }

        const { etag } = await uploadFileUint8Array(upload.contentToUpload, upload.urlToUpload, {
          progressCallback: (_, uploadedBytes) => {
            notifyProgress(upload.index, uploadedBytes);
          },
          abortController: uploadsAbortController,
        });

        const ETag = etag;

        if (!ETag) {
          throw new Error('ETag header was not returned');
        }
        fileParts.push({
          ETag,
          PartNumber: upload.index + 1,
        });
      };

      const uploadQueue: QueueObject<UploadTask> = queue<UploadTask>(function (task, callback) {
        worker(task)
          .then(() => {
            callback();
          })
          .catch((e) => {
            callback(e);
          });
      }, limitConcurrency);

      const fileHash = await processEveryFileBlobReturnHash(fileReadable, async (part: Uint8Array) => {
        if (uploadQueue.running() === limitConcurrency) {
          await uploadQueue.unsaturated();
        }

        if (uploadsAbortController.signal.aborted) {
          if (realError) throw realError;
          else throw new Error('Upload cancelled by user');
        }

        let errorAlreadyThrown = false;

        uploadQueue
          .pushAsync({
            contentToUpload: part,
            urlToUpload: urls[partIndex],
            index: partIndex++,
          })
          .catch((err) => {
            if (errorAlreadyThrown) return;

            errorAlreadyThrown = true;
            if (err) {
              uploadQueue.kill();
              if (!uploadsAbortController?.signal.aborted) {
                // Failed due to other reason, so abort requests
                uploadsAbortController.abort();
                // TODO: Do it properly with ```options.abortController?.abort(err.message);``` available from Node 17.2.0 in advance
                // https://github.com/node-fetch/node-fetch/issues/1462
                realError = err;
              }
            }
          });
      });

      while (uploadQueue.running() > 0 || uploadQueue.length() > 0) {
        await uploadQueue.drain();
      }

      return {
        hash: fileHash,
        parts: fileParts.sort((pA, pB) => pA.PartNumber - pB.PartNumber),
      };
    };

    return uploadMultipartFile(
      this.network,
      this.cryptoLib,
      bucketId,
      mnemonic,
      file.size,
      encryptFile,
      uploadFileMultipart,
      options.parts,
    );
  }

  async download(
    bucketId: string,
    fileId: string,
    mnemonic: string,
    options?: DownloadOptions,
  ): Promise<ReadableStream> {
    const encryptedContentStreams: ReadableStream<Uint8Array>[] = [];
    let fileStream: ReadableStream<Uint8Array>;

    // TODO: Check hash when downloaded

    await downloadFile(
      fileId,
      bucketId,
      mnemonic,
      this.network,
      this.cryptoLib,
      Buffer.from,
      async (downloadables) => {
        for (const downloadable of downloadables) {
          if (options?.abortController?.signal.aborted) {
            throw new Error('Download aborted');
          }

          const encryptedContentStream = await fetch(downloadable.url, {
            signal: options?.abortController?.signal,
          }).then((res) => {
            if (!res.body) {
              throw new Error('No content received');
            }

            return res.body;
          });

          encryptedContentStreams.push(encryptedContentStream);
        }
      },
      async (algorithm, key, iv, fileSize) => {
        const decryptedStream = getDecryptedStream(
          encryptedContentStreams,
          createDecipheriv('aes-256-ctr', options?.key || (key as Buffer), iv as Buffer),
        );

        fileStream = buildProgressStream(decryptedStream, (readBytes) => {
          options && options.downloadingCallback && options.downloadingCallback(fileSize, readBytes);
        });
      },
      (options?.token && { token: options.token }) || undefined,
    );

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return fileStream!;
  }

  /**
   * Downloads a file in chunks and streams the chunks as they are downloaded.
   * @param bucketId The bucket ID where the file is located.
   * @param fileId The file ID of the file to download.
   * @param mnemonic The mnemonic used to encrypt the file.
   * @param fileSize The size of the file in bytes.
   * @param options The options to download the file.
   * @returns A promise that resolves to a readable stream of the file.
   */
  async downloadMultipart(
    bucketId: string,
    fileId: string,
    mnemonic: string,
    fileSize: number,
    options?: DownloadOptions,
  ): Promise<ReadableStream<Uint8Array>> {
    const maxChunkRetires = 3;
    const chunkSize = 1024 * 1024 * 30;
    const concurrency = 3;
    const tasks = NetworkUtils.instance.createDownloadChunks(fileSize, chunkSize, maxChunkRetires);

    let downloadedBytes = 0;
    let completedChunksDownloadedCount = 0;

    const downloadTask = async (
      task: DownloadChunkTask,
      completedChunks: Array<Uint8Array[] | null>,
      streamOrderedChunks: () => void,
    ) => {
      const chunkStream = await this.downloadChunk(bucketId, fileId, mnemonic, task.chunkStart, task.chunkEnd, options);
      const reader = chunkStream.getReader();
      const chunkData: Uint8Array[] = [];

      let isDownloadingDone = false;
      try {
        while (!isDownloadingDone) {
          const { done, value } = await reader.read();

          if (done) {
            isDownloadingDone = true;
            continue;
          }

          chunkData.push(value);
          downloadedBytes += value.length;
          options?.downloadingCallback?.(fileSize, downloadedBytes);
        }

        completedChunks[task.index] = chunkData;
        completedChunksDownloadedCount++;

        streamOrderedChunks();
      } finally {
        reader.releaseLock();
      }
    };

    const handleChunkError = ({
      task,
      errorMessage,
      controller,
      downloadQueue,
    }: {
      task: DownloadChunkTask;
      errorMessage: string;
      downloadQueue: QueueObject<DownloadChunkTask>;
      controller: ReadableStreamDefaultController<Uint8Array>;
    }) => {
      if (task.attempt >= task.maxRetries) {
        const error = new Error('Download failed: ' + errorMessage);
        options?.abortController?.abort();
        downloadQueue.kill();
        controller.error(error);
        return;
      }

      task.attempt++;
      downloadQueue.unshift(task);
    };

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        // Store and stream the chunks sorted
        let nextChunkToStream = 0;

        const completedChunks: Array<Uint8Array[] | null> = new Array(tasks.length).fill(null);

        const streamOrderedChunks = () => {
          while (nextChunkToStream < completedChunks.length && completedChunks[nextChunkToStream] !== null) {
            const chunkData = completedChunks[nextChunkToStream]!;

            for (const data of chunkData) {
              controller.enqueue(data);
            }

            completedChunks[nextChunkToStream] = null;
            nextChunkToStream++;
            chunkData.length = 0;
          }
        };

        // Download the chunks and stream - then use queue to download them in parallel
        const downloadQueue = queue(
          async (task: DownloadChunkTask) => await downloadTask(task, completedChunks, streamOrderedChunks),
          concurrency,
        );

        downloadQueue.error((err, task) => {
          handleChunkError({ task, errorMessage: err.message, downloadQueue, controller });
        });

        downloadQueue.drain(() => {
          streamOrderedChunks();

          if (completedChunksDownloadedCount === tasks.length && nextChunkToStream < tasks.length) {
            console.warn('[DOWNLOAD-MULTIPART] Streaming the remaining chunks before closing the stream');
            streamOrderedChunks();
          }

          controller.close();
        });

        for (const chunk of tasks) {
          downloadQueue.push(chunk);
        }
      },
    });
  }

  /**
   * Downloads a chunk of a file from the network.
   * @param bucketId The bucket ID where the file is located.
   * @param fileId The file ID of the file to download.
   * @param mnemonic The mnemonic used to encrypt the file.
   * @param chunkStart The start of the chunk in bytes.
   * @param chunkEnd The end of the chunk in bytes.
   * @param options The options to download the file.
   * @returns A promise that resolves to a readable stream of the file chunk.
   */
  async downloadChunk(
    bucketId: string,
    fileId: string,
    mnemonic: string,
    chunkStart: number,
    chunkEnd: number,
    options?: DownloadOptions,
  ): Promise<ReadableStream<Uint8Array>> {
    const encryptedContentStreams: ReadableStream<Uint8Array>[] = [];
    let fileStream: ReadableStream<Uint8Array>;

    await downloadFile(
      fileId,
      bucketId,
      mnemonic,
      this.network,
      this.cryptoLib,
      Buffer.from,
      async (downloadables) => {
        for (const downloadable of downloadables) {
          if (options?.abortController?.signal.aborted) {
            throw new Error('Download aborted');
          }

          const response = await fetch(downloadable.url, {
            signal: options?.abortController?.signal,
            headers: {
              Range: `bytes=${chunkStart}-${chunkEnd}`,
            },
          });

          if (response.status !== 206 && response.status !== 200) {
            throw new Error(`Unexpected status ${response.status}`);
          }

          if (!response.body) {
            throw new Error('No content received');
          }

          encryptedContentStreams.push(response.body);
        }
      },
      async (algorithm, key, iv, fileSize) => {
        fileStream = decryptStream(encryptedContentStreams, key as Buffer, iv as Buffer, chunkStart);
      },
      (options?.token && { token: options.token }) || undefined,
    );

    return fileStream!;
  }
}
