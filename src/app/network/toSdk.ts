import { Network as NetworkModule } from '@internxt/sdk';
import { GetDownloadLinksResponse } from '@internxt/sdk/dist/network';

type ToBufferFunction = (input: string, encoding: 'hex') => IBuffer;

interface IBuffer {
  slice: (from: number, to: number) => IBuffer;
  toString(encoding: 'hex'): string;
}

enum Algorithm {
  AES256CTR = 'aes-256-ctr'
}

interface ICrypto {
  randomBytes: (bytesLength: number) => IBuffer;
  generateFileKey: (mnemonic: string, bucketId: string, index: IBuffer | string) => Promise<IBuffer>;
}

type Hash = string;

const INDEX_BYTES_LENGTH = 32;

export async function uploadFile(
  network: NetworkModule.Network,
  crypto: ICrypto,
  bucketId: string,
  mnemonic: string,
  fileSize: number,
  encryptFile: (algorithm: Algorithm, key: IBuffer, iv: IBuffer) => Promise<void>,
  uploadFile: (url: string) => Promise<Hash>
): Promise<string> {
  const startUploadResponse = await network.startUpload(bucketId, {
    uploads: [{
      index: 0,
      size: fileSize
    }]
  });

  const index = crypto.randomBytes(INDEX_BYTES_LENGTH);
  const iv = index.slice(0, 16);
  const key = await crypto.generateFileKey(mnemonic, bucketId, index);

  await encryptFile(Algorithm.AES256CTR, key, iv);
  const hash = await uploadFile(startUploadResponse.uploads[0].url);

  const finishUploadResponse = await network.finishUpload(bucketId, {
    index: index.toString('hex'),
    shards: [
      {
        hash,
        uuid: startUploadResponse.uploads[0].uuid
      }
    ]
  });

  const fileId = (finishUploadResponse as unknown as { id: string }).id;

  return fileId;
}


type DownloadFileFunction = (downloadable: { hash: string, link: string }[], fileSize: number) => Promise<void>;
type DecryptFileFunction = (algorithm: Algorithm, key: IBuffer, iv: IBuffer, fileSize: number) => Promise<void>;

export async function downloadFile(
  network: NetworkModule.Network,
  bucketId: string,
  fileId: string,
  mnemonic: string,
  crypto: ICrypto,
  toBuffer: ToBufferFunction,
  downloadFile: DownloadFileFunction,
  decryptFile: DecryptFileFunction
): Promise<void> {
  const getDownloadLinksResponse = await network.getDownloadLinks(bucketId, fileId);

  const { index, shards, version, size } = (
    getDownloadLinksResponse as GetDownloadLinksResponse & { version?: number, size: number }
  );

  if (!version || version === 1) {
    throw new Error('File with version 1');
  }

  const iv = toBuffer(index, 'hex').slice(0, 16);
  const key = await crypto.generateFileKey(mnemonic, bucketId, toBuffer(index, 'hex'));
  // TODO: Typings of SDK, index is a number, not a string
  const downloadables = shards.sort((sA, sB) => parseInt(sA.index) - parseInt(sB.index))
    .map(s => {
      return {
        hash: s.hash,
        link: s.url
      };
    });

  await downloadFile(downloadables, size);
  await decryptFile(Algorithm.AES256CTR, key, iv, size);
}
