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

interface UploadOptions {
  uploadingCallback: UploadProgressCallback;
  abortController?: AbortController;
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

/**
 * The entry point for interacting with the network 
 */
export class NetworkFacade {
  private readonly cryptoLib: NetworkModule.Crypto;

  constructor(private readonly network: NetworkModule.Network) {
    this.cryptoLib = {
      algorithm: NetworkModule.ALGORITHMS.AES256CTR,
      validateMnemonic: (mnemonic) => {
        return validateMnemonic(mnemonic);
      },
      generateFileKey: (mnemonic, bucketId, index) => {
        return Environment.utils.generateFileKey(
          mnemonic,
          bucketId,
          (index as Buffer)
        );
      },
      randomBytes
    };
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
      async (algorithm, key, iv) => {
        const cipher = createCipheriv('aes-256-ctr', (key as Buffer), (iv as Buffer));
        const [encryptedFile, hash] = await getEncryptedFile(file, cipher);

        fileToUpload = encryptedFile;
        fileHash = hash;
      },
      async (url: string) => {
        const useProxy = process.env.REACT_APP_DONT_USE_PROXY !== 'true' && !new URL(url).hostname.includes('internxt');
        const fetchUrl = (useProxy ? process.env.REACT_APP_PROXY + '/' : '') + url;

        await uploadFileBlob(
          fileToUpload,
          fetchUrl,
          {
            progressCallback: options.uploadingCallback,
            abortController: options.abortController
          }
        );

        /**
         * TODO: Memory leak here, probably due to closures usage with this variable.
         * Pending to be solved, do not remove this line unless the leak is solved.
         */
        fileToUpload = new Blob([]);

        return fileHash;
      }
    );
  }

  uploadMultipart(bucketId: string, mnemonic: string, file: File, options: UploadMultipartOptions): Promise<string> {
    let fileReadable: ReadableStream<Uint8Array>;

    const partsUploadedBytes: Record<number, number> = {};

    function notifyProgress(partId: number, uploadedBytes: number) {
      partsUploadedBytes[partId] = uploadedBytes;

      options.uploadingCallback(
        file.size, 
        Object.values(partsUploadedBytes).reduce((a,p) => a+p, 0)
      );
    }

    const limitConcurrency = 6;

    interface UploadTask {
      contentToUpload: Blob;
      urlToUpload: string;
      index: number;
    }

    const fileParts: { PartNumber: number; ETag: string }[] = [];

    const worker = async (upload: UploadTask) => {
      console.log(
        'Uploading chunk of %s bytes to url %s, part %s', 
        upload.contentToUpload.size, 
        upload.urlToUpload, 
        upload.index
      );

      const response = await uploadFileBlob(upload.contentToUpload, upload.urlToUpload, {
        progressCallback: (_, uploadedBytes) => {
          notifyProgress(upload.index, uploadedBytes);
        },
        abortController: options.abortController,
      });

      const ETag = response.getResponseHeader('etag');

      if (!ETag) {
        throw new Error('ETag header was not returned');
      }
      fileParts.push({
        ETag,
        PartNumber: upload.index + 1,
      });
    };

    const uploadQueue: QueueObject<UploadTask> = queue<UploadTask>(worker, limitConcurrency);

    let currentConcurrency = 0;

    return uploadMultipartFile(
      this.network,
      this.cryptoLib,
      bucketId,
      mnemonic,
      file.size,
      async (algorithm, key, iv) => {
        const cipher = createCipheriv('aes-256-ctr', key as Buffer, iv as Buffer);
        fileReadable = encryptStreamInParts(file, cipher, options.parts);
      },
      async (urls: string[]) => {
        let partIndex = 0;

        const fileHash = await processEveryFileBlobReturnHash(fileReadable, async (blob) => {
          while (currentConcurrency == limitConcurrency) {
            await new Promise(r => setTimeout(r, 150));
          }
          currentConcurrency++;

          uploadQueue.push({
            contentToUpload: blob,
            urlToUpload: urls[partIndex],
            index: partIndex++,
          }, (err) => {
            if (err) {
              console.error('Error uploading file part', err);
            }
            currentConcurrency--;
          });  
          
          blob = new Blob([]);
        });

        while (uploadQueue.running() > 0 || uploadQueue.length() > 0) {
          await uploadQueue.drain();
        }

        return {
          hash: fileHash,
          parts: fileParts.sort((pA, pB) => pA.PartNumber - pB.PartNumber),
        };
      },
      options.parts,
    );
  }


  async download(
    bucketId: string,
    fileId: string,
    mnemonic: string,
    options?: DownloadOptions
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

          const encryptedContentStream = await fetch(downloadable.url, { signal: options?.abortController?.signal })
            .then((res) => {
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
          createDecipheriv('aes-256-ctr', options?.key || (key as Buffer), (iv as Buffer)),
        );

        fileStream = buildProgressStream(decryptedStream, (readBytes) => {
          options && options.downloadingCallback && options.downloadingCallback(fileSize, readBytes);
        });
      },
      options && options.token && { token: options.token } || undefined
    );

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return fileStream!;
  }
}
