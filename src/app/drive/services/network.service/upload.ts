import { Cipher, createHash, randomBytes } from 'crypto';
import { Environment } from '@internxt/inxt-js';
import { Sha256 } from 'asmcrypto.js';
import EventEmitter from 'events';
import { v4 } from 'uuid';

import { finishUpload, getUploadUrl, prepareUpload } from './requests';
import { createAES256Cipher, encryptFilename } from './crypto';

export interface Abortable {
  stop: () => void;
}

class UploadAbortedError extends Error {
  constructor() {
    super('Upload aborted');
  }
}

interface NetworkCredentials {
  user: string;
  pass: string;
}

interface IUploadParams {
  filesize: number;
  filecontent: File;
  creds: NetworkCredentials;
  mnemonic: string;
  progressCallback: ProgressCallback;
}

type ProgressCallback = (progress: number, uploadedBytes: number | null, totalBytes: number | null) => void;

type Hash = string;
async function getEncryptedFile(plainFile: File, cipher: Cipher): Promise<[Blob, Hash]> {
  const readable = encryptReadable(plainFile.stream(), cipher).getReader();
  const hasher = new Sha256();
  const blobParts: ArrayBuffer[] = [];

  let done = false;

  while (!done) {
    const status = await readable.read();

    if (!status.done) {
      hasher.process(status.value);
      blobParts.push(status.value);
    }

    done = status.done;
  }

  hasher.finish();

  return [
    new Blob(blobParts, { type: 'application/octet-stream' }),
    createHash('ripemd160').update(Buffer.from(hasher.result!)).digest('hex'),
  ];
}

/**
 * Given a stream and a cipher, encrypt its content
 * @param readable Readable stream
 * @param cipher Cipher used to encrypt the content
 * @returns A readable whose output is the encrypted content of the source stream
 */
function encryptReadable(readable: ReadableStream<Uint8Array>, cipher: Cipher): ReadableStream<Uint8Array> {
  const reader = readable.getReader();

  const encryptedFileReadable = new ReadableStream({
    async start(controller) {
      let done = false;

      while (!done) {
        const status = await reader.read();

        if (!status.done) {
          controller.enqueue(cipher.update(status.value));
        }

        done = status.done;
      }
      controller.close();
    },
  });

  return encryptedFileReadable;
}

function uploadFileBlob(
  encryptedFile: Blob,
  url: string,
  opts: {
    progressCallback: (progress: number) => void;
  },
): [Promise<void>, Abortable] {
  const uploadRequest = new XMLHttpRequest();
  const eventEmitter = new EventEmitter().once('abort', () => {
    uploadRequest.abort();
  });

  uploadRequest.upload.addEventListener('progress', (e) => {
    opts.progressCallback(e.loaded / e.total);
  });
  uploadRequest.upload.addEventListener('loadstart', () => opts.progressCallback(0));
  uploadRequest.upload.addEventListener('loadend', () => opts.progressCallback(1));

  const uploadFinishedPromise = new Promise<void>((resolve, reject) => {
    uploadRequest.onload = (e) => {
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

export function uploadFile(bucketId: string, params: IUploadParams): [Promise<string>, Abortable | undefined] {
  let aborted = false;
  let uploadAbortable: Abortable;

  const file: File = params.filecontent;
  const eventEmitter = new EventEmitter().once('abort', () => {
    aborted = true;
    uploadAbortable?.stop();
  });

  const uploadPromise = (async () => {
    const index = randomBytes(32);
    const iv = index.slice(0, 16);

    const frameId = await prepareUpload(bucketId, params.creds);
    if (aborted) {
      throw new UploadAbortedError();
    }

    const encryptionKey = await Environment.utils.generateFileKey(params.mnemonic, bucketId, index);
    if (aborted) {
      throw new UploadAbortedError();
    }

    const [encryptedFile, fileHash] = await getEncryptedFile(file, createAES256Cipher(encryptionKey, iv));

    const shardMeta = {
      hash: fileHash,
      index: 0,
      parity: false,
      size: params.filesize,
    };
    if (aborted) {
      throw new UploadAbortedError();
    }

    const uploadUrl = new URL(await getUploadUrl(frameId, shardMeta, params.creds));
    if (aborted) {
      throw new UploadAbortedError();
    }

    const useProxy = !uploadUrl.hostname.includes('internxt');

    const [uploadPromise, uploadFileAbortable] = await uploadFileBlob(
      encryptedFile,
      (useProxy && process.env.REACT_APP_PROXY + '/') + uploadUrl.toString(),
      {
        progressCallback: (progress) => params.progressCallback(progress, null, null),
      },
    );

    uploadAbortable = uploadFileAbortable;
    await uploadPromise;

    const encryptedFilename = await encryptFilename(params.mnemonic, bucketId, v4());
    if (aborted) {
      throw new UploadAbortedError();
    }

    return finishUpload(
      params.mnemonic,
      bucketId,
      frameId,
      encryptedFilename,
      index,
      encryptionKey,
      shardMeta,
      params.creds,
    );
  })();

  return [
    uploadPromise,
    {
      stop: () => {
        eventEmitter.emit('abort');
      },
    },
  ];
}
