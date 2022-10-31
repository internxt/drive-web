import { Environment } from '@internxt/inxt-js';
import { Network as NetworkModule } from '@internxt/sdk';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { validateMnemonic } from 'bip39';
import { uploadFile } from '@internxt/sdk/dist/network/upload';
import { downloadFile } from '@internxt/sdk/dist/network/download';

import { getEncryptedFile } from './crypto';
import { DownloadProgressCallback, getDecryptedStream } from './download';
import { uploadFileBlob, UploadProgressCallback } from './upload';
import { buildProgressStream } from 'app/core/services/stream.service';
import EnvService from 'app/core/services/dynamicEnv.service';

interface UploadOptions {
  uploadingCallback: UploadProgressCallback;
  abortController?: AbortController;
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
  private cryptoLib: NetworkModule.Crypto;

  constructor(private network: NetworkModule.Network) {
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
        const useProxy =
          EnvService.selectedEnv.REACT_APP_DONT_USE_PROXY !== 'true' && !new URL(url).hostname.includes('internxt');
        const fetchUrl = (useProxy ? EnvService.selectedEnv.REACT_APP_PROXY + '/' : '') + url;

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

          const useProxy =
            EnvService.selectedEnv.REACT_APP_DONT_USE_PROXY !== 'true' &&
            !new URL(downloadable.url).hostname.includes('internxt');
          const fetchUrl = (useProxy ? EnvService.selectedEnv.REACT_APP_PROXY + '/' : '') + downloadable.url;

          const encryptedContentStream = await fetch(fetchUrl, { signal: options?.abortController?.signal }).then(
            (res) => {
              if (!res.body) {
                throw new Error('No content received');
              }

              return res.body;
            },
          );

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
      (options && options.token && { token: options.token }) || undefined,
    );

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return fileStream!;
  }
}
