import { v4 } from 'uuid';
import EventEmitter from 'events';
import { randomBytes } from 'crypto';
import { Environment } from '@internxt/inxt-js';
import { Network } from '@internxt/sdk/dist/network';

import { createAES256Cipher, encryptFilename, getEncryptedFile, sha256 } from './crypto';
import { NetworkFacade } from '.';
import { finishUpload, getUploadUrl, prepareUpload } from './requests';
import { Abortable } from './Abortable';

export type UploadProgressCallback = (totalBytes: number, uploadedBytes: number) => void;

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
  progressCallback: UploadProgressCallback;
}

export function uploadFileBlob(
  encryptedFile: Blob,
  url: string,
  opts: {
    progressCallback: UploadProgressCallback
  },
): [Promise<void>, Abortable] {
  const uploadRequest = new XMLHttpRequest();
  const eventEmitter = new EventEmitter().once('abort', () => {
    uploadRequest.abort();
  });

  uploadRequest.upload.addEventListener('progress', (e) => {
    opts.progressCallback(e.total, e.loaded);
  });
  uploadRequest.upload.addEventListener('loadstart', (e) => opts.progressCallback(e.total, 0));
  uploadRequest.upload.addEventListener('loadend', (e) => opts.progressCallback(e.total, e.total));

  const uploadFinishedPromise = new Promise<void>((resolve, reject) => {
    uploadRequest.onload = () => {
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
      abort: () => {
        eventEmitter.emit('abort');
      },
    },
  ];
}

function getAuthFromCredentials(creds: NetworkCredentials): { username: string, password: string } {
  return {
    username: creds.user,
    password: sha256(Buffer.from(creds.pass)).toString('hex'),
  };
}

export function uploadFile(bucketId: string, params: IUploadParams): [Promise<string>, Abortable | undefined] {
  let aborted = false;
  let uploadAbortable: Abortable;

  const file: File = params.filecontent;
  const eventEmitter = new EventEmitter().once('abort', () => {
    aborted = true;
    uploadAbortable?.abort();
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
        progressCallback: (progress) => params.progressCallback(progress, 0),
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
      abort: () => {
        eventEmitter.emit('abort');
      },
    },
  ];
}

function uploadFileV2(bucketId: string, params: IUploadParams): [Promise<string>, Abortable | undefined] {
  let aborted = false;
  let uploadAbortable: Abortable;

  const file: File = params.filecontent;
  const eventEmitter = new EventEmitter().once('abort', () => {
    aborted = true;
    uploadAbortable?.abort();
  });

  const uploadPromise = (() => {
    const auth = getAuthFromCredentials({
      user: params.creds.user,
      pass: params.creds.pass
    });

    return new NetworkFacade(
      Network.client(
        process.env.REACT_APP_STORJ_BRIDGE as string,
        {
          clientName: 'drive-web',
          clientVersion: '1.0'
        },
        {
          bridgeUser: auth.username,
          userId: auth.password
        }
      ),
    ).upload(
      bucketId,
      params.mnemonic,
      file,
      {
        uploadingCallback: params.progressCallback
      }
    );
  })();

  return [
    uploadPromise,
    {
      abort: () => {
        eventEmitter.emit('abort');
      },
    },
  ];
}
