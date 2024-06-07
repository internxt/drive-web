import { Environment } from '@internxt/inxt-js';
import { Network as NetworkModule } from '@internxt/sdk';
import { downloadFile } from '@internxt/sdk/dist/network/download';
import { uploadFile, uploadMultipartFile } from '@internxt/sdk/dist/network/upload';
import { validateMnemonic } from 'bip39';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

import { EncryptFileFunction, UploadFileMultipartFunction } from '@internxt/sdk/dist/network';
import { QueueObject, queue } from 'async';
import { WORKER_MESSAGE_STATES } from '../../WebWorker';
import { buildProgressStream } from '../core/services/stream.service';
import { waitForContinueUploadSignal } from '../drive/services/worker.service/uploadWorkerUtils';
import { TaskStatus } from '../tasks/types';
import { encryptStreamInParts, getEncryptedFile, processEveryFileBlobReturnHash } from './crypto';
import { DownloadProgressCallback, getDecryptedStream } from './download';
import { UploadProgressCallback, uploadFileBlob } from './upload';

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

  private handleWorkerMessage = (msg) => {
    if (msg.data.result === WORKER_MESSAGE_STATES.UPLOAD_STATUS) {
      this.isPaused = msg.data.uploadStatus.status === TaskStatus.Paused;
    }
  };

  upload(bucketId: string, mnemonic: string, file: File, options: UploadOptions): Promise<string> {
    let fileToUpload: Blob;
    let fileHash: string;

    return uploadFile(
      this.network,
      this.cryptoLib,
      bucketId,
      mnemonic,
      file.size,
      async (algorithm, key, iv) => {
        const cipher = createCipheriv('aes-256-ctr', key as Buffer, iv as Buffer);
        const [encryptedFile, hash] = await getEncryptedFile(file, cipher);

        fileToUpload = encryptedFile;
        fileHash = hash;
      },
      async (url: string) => {
        const useProxy = process.env.REACT_APP_DONT_USE_PROXY !== 'true' && !new URL(url).hostname.includes('internxt');
        const fetchUrl = (useProxy ? process.env.REACT_APP_PROXY + '/' : '') + url;
        const isPaused = options.continueUploadOptions?.isPaused;

        postMessage({ result: WORKER_MESSAGE_STATES.CHECK_UPLOAD_STATUS });
        if (isPaused && options?.continueUploadOptions?.taskId)
          await waitForContinueUploadSignal(options?.continueUploadOptions?.taskId);

        await uploadFileBlob(fileToUpload, fetchUrl, {
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
          options?.downloadingCallback && options.downloadingCallback(fileSize, readBytes);
        });
      },
      (options?.token && { token: options.token }) || undefined,
    );
    console.log('finalizdo');

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return fileStream!;
  }
}
