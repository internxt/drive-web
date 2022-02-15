import { Cipher, createHash } from 'crypto';
import { Sha256 } from 'asmcrypto.js';
import EventEmitter from 'events';

export interface Abortable {
  stop: () => void;
}

type Hash = string;
export async function getEncryptedFile(plainFile: File, cipher: Cipher): Promise<[Blob, Hash]> {
  const readable = plainFile.stream().getReader();
  const hasher = new Sha256();
  const blobParts: ArrayBuffer[] = [];

  let done = false;

  while (!done) {
    const status = await readable.read();

    if (!status.done) {
      const encryptedOutput = cipher.update(status.value);
      hasher.process(encryptedOutput);
      blobParts.push(encryptedOutput);
    }

    done = status.done;
  }

  hasher.finish();

  return [
    new Blob(blobParts, { type: 'application/octet-stream' }),
    createHash('ripemd160').update(Buffer.from(hasher.result!)).digest('hex'),
  ];
}

export function uploadFile(
  encryptedFile: Blob,
  url: string,
  opts: {
    progressCallback: (progress: number) => void;
  },
): [Promise<void>, Abortable] {
  const uploadRequest = new XMLHttpRequest();
  const eventEmitter = new EventEmitter().once('abort', () => {
    console.log('abort');
    uploadRequest.abort();
  });

  uploadRequest.upload.addEventListener('progress', (e) => {
    opts.progressCallback(e.loaded / e.total);
  });
  uploadRequest.upload.addEventListener('loadstart', () => opts.progressCallback(0));
  uploadRequest.upload.addEventListener('loadend', () => opts.progressCallback(1));

  const uploadFinishedPromise = new Promise<void>((resolve, reject) => {
    uploadRequest.onload = (e) => {
      console.log('upload finished');
      if (uploadRequest.status !== 200) {
        return reject(
          new Error('Upload failed with code ' + uploadRequest.status + ' message ' + uploadRequest.response),
        );
      }
      resolve();
    };
    uploadRequest.onerror = reject;
    uploadRequest.onabort = () => reject(new Error('Upload aborted'));
    uploadRequest.ontimeout = () => reject(new Error('Request timeout'));
  });

  uploadRequest.open('PUT', url);
  uploadRequest.send(encryptedFile);

  return [
    uploadFinishedPromise,
    {
      stop: () => {
        eventEmitter.emit('abort');
      },
    },
  ];
}
