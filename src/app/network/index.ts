import { Environment } from '@internxt/inxt-js';
import { Network as NetworkModule } from '@internxt/sdk';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

import { encryptFilename, getEncryptedFile } from './crypto';
import { uploadFile, downloadFile } from './toSdk';
import { DownloadProgressCallback, getDecryptedStream } from './download';
import { uploadFileBlob, UploadProgressCallback } from './upload';
import { buildProgressStream } from 'app/core/services/stream.service';

// START TODO: Move to SDK
type Hash = string;
interface IBuffer {
  slice: (from: number, to: number) => IBuffer;
  toString(encoding: 'hex'): string;
}

interface CryptoLibrary {
  randomBytes: (bytesLength: number) => IBuffer;
  generateFileKey: (mnemonic: string, bucketId: string, index: IBuffer | string) => Promise<IBuffer>;
  encryptFilename: (mnemonic: string, bucketId: string, uniqueFileId: string) => Promise<string>;
}

// END TODO: Move to SDK


interface UploadOptions {
  uploadingCallback: UploadProgressCallback;
}

interface DownloadOptions {
  key?: IBuffer;
  downloadingCallback?: DownloadProgressCallback;
}

/**
 * This class has these responsabilities:
 * - Encrypting / Decrypting files
 * - Uploading / Downloading files 
 * - Provide feedback about the progress of this actions.
 * 
 */
export class NetworkFacade {
  private cryptoLib: CryptoLibrary;

  constructor(private network: NetworkModule.Network) {
    this.cryptoLib = {
      encryptFilename,
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
    let fileHash: Hash;

    return uploadFile(
      this.network,
      this.cryptoLib,
      bucketId,
      mnemonic,
      file.size,
      async (algorithm, key, iv) => {
        const cipher = createCipheriv(algorithm, (key as Buffer), (iv as Buffer));
        const [encryptedFile, hash] = await getEncryptedFile(file, cipher);

        fileToUpload = encryptedFile;
        fileHash = hash;
      },
      async (url: string) => {
        const [uploadPromise] = uploadFileBlob(
          fileToUpload,
          process.env.REACT_APP_PROXY + '/' + url,
          {
            progressCallback: options.uploadingCallback
          }
        );

        await uploadPromise.catch((err) => {
          console.error(err);
        });

        return fileHash;
      }
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

    await downloadFile(
      this.network,
      bucketId,
      fileId,
      mnemonic,
      this.cryptoLib,
      Buffer.from,
      async (downloadables) => {
        for (const downloadable of downloadables) {
          const encryptedContentStream = await fetch(downloadable.link)
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
        const [decryptedStream] = getDecryptedStream(
          encryptedContentStreams,
          createDecipheriv(algorithm, (key as Buffer), (iv as Buffer)),
        );

        fileStream = buildProgressStream(decryptedStream, (readBytes) => {
          options && options.downloadingCallback && options.downloadingCallback(fileSize, readBytes);
        });
      }
    );

    return fileStream!;
  }
}
