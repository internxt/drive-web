import { Environment } from '@internxt/inxt-js';
import { Network, BasicAuth } from '@internxt/sdk';
import { Cipher, createDecipheriv, Decipher, randomBytes } from 'crypto';

import { createAES256Cipher, encryptFilename, getEncryptedFile } from './crypto';

// START TODO: Move to SDK
type Hash = string;
type IWritableStream = WritableStream;
interface IBuffer {
  slice: (from: number, to: number) => IBuffer;
  toString(encoding: 'hex'): IBuffer;
}

const INDEX_BYTES_LENGTH = 32;

type IFile = File
type ICipher = Cipher;
type IDecipher = { pipeTo: (writable: IWritableStream) => Promise<void> };

enum Algorithm {
  AES256CTR = 'aes-256-ctr'
}

interface CryptoLibrary {
  randomBytes: (bytesLength: number) => IBuffer;
  generateFileKey: (mnemonic: string, bucketId: string, index: IBuffer | string) => Promise<IBuffer>;
  getEncryptedFile: (plainFile: IFile, cipher: ICipher) => Promise<[IFile, Hash]>;
  encryptFilename: (mnemonic: string, bucketId: string, uniqueFileId: string) => Promise<string>;
  createAES256Cipher: (key: IBuffer, iv: IBuffer) => ICipher;
  createDecipher: (algorithm: Algorithm.AES256CTR, key: IBuffer, iv: IBuffer) => IDecipher;
}

// END TODO: Move to SDK

interface UploadOptions {
  encryptingCallback: (totalBytes: number, encryptedBytes: number) => void
  uploadingCallback: (totalBytes: number, uploadedBytes: number) => void
}

interface DownloadOptions {
  key: IBuffer;
  decryptingCallback: (totalBytes: number, decryptedBytes: number) => void;
  downloadingCallback: (totalBytes: number, downloadedBytes: number) => void;
}

class Transform {
  constructor(private readable: ReadableStream) { }
  async pipeTo(writable): Promise<void> { }
}

/**
 * This class has these responsabilities:
 * - Encrypting / Decrypting files
 * - Uploading / Downloading files 
 * - Provide feedback about the progress of this actions.
 * 
 */
export class NetworkFacade {
  // TODO: Singleton or static methods?
  constructor(
    private network: Network,
    private cryptoLib: CryptoLibrary,
    private creds: BasicAuth
  ) {
    this.cryptoLib = {
      createAES256Cipher,
      encryptFilename,
      generateFileKey: Environment.utils.generateFileKey,
      getEncryptedFile,
      randomBytes
    };
  }

  async upload(file: File, options: UploadOptions): Promise<string> {
    const bucketId = '';
    const uploads: any[] = [];

    const uploadLinks: string[] = await Network.startUpload({ idBucket: bucketId, uploads });
    const shards = [];

    const mnemonic = '';
    const index: IBuffer = this.cryptoLib.randomBytes(INDEX_BYTES_LENGTH);
    const iv: IBuffer = index.slice(0, 16);
    const encryptionKey = await this.cryptoLib.generateFileKey(mnemonic, bucketId, index);
    const cipher = this.cryptoLib.createAES256Cipher(encryptionKey, iv);

    const [encryptedFile, hash] = await this.cryptoLib.getEncryptedFile(
      file,
      cipher
    );

    for (const upload of uploads) {
      // await httpService.put(.....)
    }

    const fileId = await Network.finishUpload({ idBucket: bucketId, index: '', shards });

    return fileId;
  }

  async download(
    // output: Interface that could be a stream, a blob etc
    options: DownloadOptions
  ): Promise<void> {
    // differentiate between v1 and v2, one shard and multiple...
    const bucketId = '';
    const fileId = '';
    const mnemonic = '';

    const downloadLinks: string[] = await Network.getDownloadLinks({ idBucket: bucketId, file: fileId });
    const encryptedContentParts: ReadableStream<Uint8Array>[] = [];

    for (const downloadLink of downloadLinks) {
      // const readable / blob = await httpService.get(downloadLink, auth);
      const readable: ReadableStream<Uint8Array>;

      encryptedContentParts.push(readable);
    }

    const index: IBuffer = Buffer.from('eeee', 'hex');
    const iv = index.slice(0, 16);

    let decryptionKey: IBuffer;

    if (options.key) {
      decryptionKey = options.key;
    } else if (mnemonic) {
      decryptionKey = await this.cryptoLib.generateFileKey(mnemonic, bucketId, index);
    } else {
      throw new Error('Download error code 1');
    }

    // TODO: Decrypting and download progress;
    this.cryptoLib.createDecipher = (algorithm, key, iv) => {
      const decipher = createDecipheriv(algorithm, key, iv);

      return {
        async pipeTo(writable): Promise<void> {
          return new ReadableStream({
            async start(controller) {
              try {
                for (const encryptedContentSlice of encryptedContentParts) {
                  const reader = encryptedContentSlice.getReader();
                  let done = false;

                  while (!done && !aborted) {
                    const status = await reader.read();

                    if (!status.done) {
                      controller.enqueue(decipher.update(status.value));
                    }

                    done = status.done;
                  }
                }
              } finally {
                controller.close();
              }
            }
          }).pipeTo(writable);
        }
      };
    }

    const decipher = this.cryptoLib.createDecipher(Algorithm.AES256CTR, decryptionKey, iv);
    // TODO: FS, Blob, etc
    const writable: IWritableStream =;
    // decipher.pipe(writable);

    await decipher.pipeTo(writable);
  }
}
