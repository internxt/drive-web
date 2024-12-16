import { Environment } from '@internxt/inxt-js';
import { Network as NetworkModule } from '@internxt/sdk';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { validateMnemonic } from 'bip39';
import { uploadFile, uploadMultipartFile } from '@internxt/sdk/dist/network/upload';
import { downloadFile } from '@internxt/sdk/dist/network/download';

import { getEncryptedFile, encryptStreamInParts, processEveryFileBlobReturnHash } from './crypto';
import { DownloadProgressCallback, getDecryptedStream } from './download';
import { uploadFileBlob, UploadProgressCallback } from './upload';
import { buildProgressStream } from 'app/core/services/stream.service';
import { queue, QueueObject } from 'async';
import { EncryptFileFunction, UploadFileMultipartFunction } from '@internxt/sdk/dist/network';
import { TaskStatus } from '../tasks/types';
import { waitForContinueUploadSignal } from '../drive/services/worker.service/uploadWorkerUtils';
import { WORKER_MESSAGE_STATES } from '../../WebWorker';
import { runDownload } from './download/strategies/IDownloadFileStrategy';

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
  size?: number;
  abortController?: AbortController;
  downloadingCallback?: DownloadProgressCallback;
}

interface UploadTask {
  contentToUpload: Blob;
  urlToUpload: string;
  index: number;
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
        return Environment.utils.generateFileKey(mnemonic, bucketId, index as Buffer);
      },
      randomBytes,
    };
  }

  destroy() {
    removeEventListener('message', this.handleWorkerMessage);
  }

  private handleWorkerMessage(msg) {
    if (msg.data.result === WORKER_MESSAGE_STATES.UPLOAD_STATUS) {
      this.isPaused = msg.data.uploadStatus.status === TaskStatus.Paused;
    }
  }

  upload(bucketId: string, mnemonic: string, file: File, options: UploadOptions): Promise<string> {
    let fileToUpload: Blob;
    let fileHash: string;

    return uploadFile(
      this.network,
      this.cryptoLib,
      bucketId,
      mnemonic,
      file.size,
      async (_, key, iv) => {
        const cipher = createCipheriv('aes-256-ctr', key as Buffer, iv as Buffer);
        const [encryptedFile, hash] = await getEncryptedFile(file, cipher);

        fileToUpload = encryptedFile;
        fileHash = hash;
      },
      async (url: string) => {
        const isPaused = options.continueUploadOptions?.isPaused;

        postMessage({ result: WORKER_MESSAGE_STATES.CHECK_UPLOAD_STATUS });
        if (isPaused && options?.continueUploadOptions?.taskId)
          await waitForContinueUploadSignal(options?.continueUploadOptions?.taskId);

        await uploadFileBlob(fileToUpload, url, {
          progressCallback: options.uploadingCallback,
          abortController: options.abortController,
        });

        /**
         * TODO: Memory leak here, probably due to closures usage with this variable.
         * Pending to be solved, do not remove this line unless the leak is solved.
         */
        fileToUpload = new Blob([]);

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
      fileReadable = encryptStreamInParts(file, cipher, options.parts);
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

        const { etag } = await uploadFileBlob(upload.contentToUpload, upload.urlToUpload, {
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

      const fileHash = await processEveryFileBlobReturnHash(fileReadable, async (blob) => {
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
            contentToUpload: blob,
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

        // TODO: Remove
        blob = new Blob([]);
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

  async _download(
    bucketId: string,
    fileId: string,
    mnemonic: string,
    options?: DownloadOptions,
  ): Promise<ReadableStream> {
    const encryptedContentStreams: ReadableStream<Uint8Array>[] = [];
    const abortSignal = options?.abortController?.signal;
    let unifiedDecryptedFileStream = new ReadableStream<Uint8Array>();

    async function getDownloadStream(url: string): Promise<ReadableStream<Uint8Array>> {
      const { body } = await fetch(url, { signal: abortSignal });

      if (!body) {
        throw new Error('No content received');
      }

      return body;
    }

    // TODO: Check hash when downloaded
    console.log('download method called');

    await downloadFile(
      fileId,
      bucketId,
      mnemonic,
      this.network,
      this.cryptoLib,
      Buffer.from,
      async (downloadables) => {
        const minSizeForMultipartDownload = 500 * 1024 * 1024; // 500MB
        if (options && options.size && parseInt(options.size as unknown as string) >= minSizeForMultipartDownload) {
          const fileSize = parseInt(options.size as unknown as string);
          const [{ url }] = downloadables;
          const downloadChunkSize = 20 * 1024 * 1024;

          const ranges: { start: number, end: number }[] = [];

          for (let start = 0; start < fileSize; start += downloadChunkSize) {
            const end = Math.min(start + downloadChunkSize - 1, fileSize - 1);
            ranges.push({ start, end });
          }

          for (const range of ranges) {
            const { body: stream } = await fetch(url, {
              signal: abortSignal,
              headers: {
                Range: `bytes=${range.start}-${range.end}`,
              }
            });

            if (!stream) {
              throw new Error('stream body null');
            }

            encryptedContentStreams.push(stream);
          }
        } else {
          for (const downloadable of downloadables) {
            const stream = await getDownloadStream(downloadable.url);

            encryptedContentStreams.push(stream);
          }
        }
      },
      async (_, key, iv, fileSize) => {
        const decipher = createDecipheriv('aes-256-ctr', options?.key || (key as Buffer), iv as Buffer);
        const decryptedStream = getDecryptedStream(encryptedContentStreams, decipher);

        unifiedDecryptedFileStream = buildProgressStream(decryptedStream, (readBytes) => {
          options && options.downloadingCallback && options.downloadingCallback(fileSize, readBytes);
        });
      },
      (options?.token && { token: options.token }) || undefined,
    );

    return unifiedDecryptedFileStream;
  }

  async download(
    bucketId: string,
    fileId: string,
    mnemonic: string,
    options?: DownloadOptions,
  ): Promise<ReadableStream> {
    const abortSignal = options?.abortController?.signal;
    let unifiedDecryptedFileStream = new ReadableStream<Uint8Array>();

    // TODO: Check hash when downloaded
    console.log('download method called');

    if (parseInt(options?.size as unknown as string) < 500 * 1024 * 1024) {
      return this._download(bucketId, fileId, mnemonic, options);
    }

    console.log('using cool download method');

    let urls: string[] = [];

    await downloadFile(
      fileId,
      bucketId,
      mnemonic,
      this.network,
      this.cryptoLib,
      Buffer.from,
      async (downloadables) => {
        urls = downloadables.map(({ url }) => url);
      },
      async (_, key, iv, fileSize) => {
        const stream = await runDownload(
          async () => urls,
          parseInt(options?.size as unknown as string),
          20 * 1024 * 1024
        );
        const decipher = createDecipheriv('aes-256-ctr', options?.key || (key as Buffer), iv as Buffer);
        const decryptedStream = getDecryptedStream([stream], decipher);

        unifiedDecryptedFileStream = buildProgressStream(decryptedStream, (readBytes) => {
          options && options.downloadingCallback && options.downloadingCallback(fileSize, readBytes);
        });
      },
      {
        partSize: 20 * 1024 * 1024
      }
    );

    return unifiedDecryptedFileStream;
  }
}
