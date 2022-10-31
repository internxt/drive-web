import * as Sentry from '@sentry/react';
import { Network } from '@internxt/sdk/dist/network';
import { ErrorWithContext } from '@internxt/sdk/dist/network/errors';

import { sha256 } from './crypto';
import { NetworkFacade } from './NetworkFacade';
import dynamicEnvService from '../core/services/dynamicEnv.service';

export type UploadProgressCallback = (totalBytes: number, uploadedBytes: number) => void;

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
  abortController?: AbortController;
}

export function uploadFileBlob(
  encryptedFile: Blob,
  url: string,
  opts: {
    progressCallback: UploadProgressCallback;
    abortController?: AbortController;
  },
): Promise<void> {
  const uploadRequest = new XMLHttpRequest();

  opts.abortController?.signal.addEventListener(
    'abort',
    () => {
      console.log('aborting');
      uploadRequest.abort();
    },
    { once: true },
  );

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

  return uploadFinishedPromise;
}

function getAuthFromCredentials(creds: NetworkCredentials): { username: string; password: string } {
  return {
    username: creds.user,
    password: sha256(Buffer.from(creds.pass)).toString('hex'),
  };
}

export function uploadFile(bucketId: string, params: IUploadParams): Promise<string> {
  const file: File = params.filecontent;

  const auth = getAuthFromCredentials({
    user: params.creds.user,
    pass: params.creds.pass,
  });

  return new NetworkFacade(
    Network.client(
      dynamicEnvService.selectedEnv.REACT_APP_STORJ_BRIDGE as string,
      {
        clientName: 'drive-web',
        clientVersion: '1.0',
      },
      {
        bridgeUser: auth.username,
        userId: auth.password,
      },
    ),
  )
    .upload(bucketId, params.mnemonic, file, {
      uploadingCallback: params.progressCallback,
      abortController: params.abortController,
    })
    .catch((err: ErrorWithContext) => {
      Sentry.captureException(err, { extra: err.context });

      throw err;
    });
}
