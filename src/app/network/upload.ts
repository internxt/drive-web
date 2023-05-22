import * as Sentry from '@sentry/react';
import { Network } from '@internxt/sdk/dist/network';
import { ErrorWithContext } from '@internxt/sdk/dist/network/errors';

import { sha256 } from './crypto';
import { NetworkFacade } from './NetworkFacade';
import axios, { AxiosError } from 'axios';
import { ConnectionLostError } from './requests';

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

export async function uploadFileBlob(
  content: Blob,
  url: string,
  opts: {
    progressCallback: UploadProgressCallback;
    abortController?: AbortController;
  },
): Promise<{ etag: string }> {
  try {
    const res = await axios({
      url,
      method: 'PUT',
      data: content,
      onUploadProgress: (progress: ProgressEvent) => {
        opts.progressCallback(progress.total, progress.loaded);
      },
      cancelToken: new axios.CancelToken((canceler) => {
        opts.abortController?.signal.addEventListener('abort', () => {
          canceler();
        });
      }),
    });

    return { etag: res.headers.etag };
  } catch (err) {
    const error = err as AxiosError<any>;

    if (axios.isCancel(error)) {
      throw new Error('Upload aborted');
    } else if (error.response && error.response.status === 403) {
      throw new Error('Request has expired');
    } else if (error.message === 'Network Error') {
      throw error;
    } else {
      throw new Error('Unknown error');
    }
  }
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

  const facade = new NetworkFacade(
    Network.client(
      process.env.REACT_APP_STORJ_BRIDGE as string,
      {
        clientName: 'drive-web',
        clientVersion: '1.0',
      },
      {
        bridgeUser: auth.username,
        userId: auth.password,
      },
    ),
  );

  let uploadPromise: Promise<string>;

  const minimumMultipartThreshold = 100 * 1024 * 1024;
  const useMultipart = params.filesize > minimumMultipartThreshold;
  const partSize = 30 * 1024 * 1024;

  console.time('multipart-upload');

  const uploadAbortController = new AbortController();

  let connectionLost = false;
  function connectionLostListener() {
    connectionLost = true;
    uploadAbortController.abort();
    window.removeEventListener('offline', connectionLostListener);
  }
  window.addEventListener('offline', connectionLostListener);

  function onAbort() {
    if (!connectionLost) {
      // propagate abort just if the connection is not lost.

      uploadAbortController.abort();
    }

    params.abortController?.signal.removeEventListener('abort', onAbort);
  }

  params.abortController?.signal.addEventListener('abort', onAbort);

  if (useMultipart) {
    uploadPromise = facade.uploadMultipart(bucketId, params.mnemonic, file, {
      uploadingCallback: params.progressCallback,
      abortController: uploadAbortController,
      parts: Math.ceil(params.filesize / partSize),
    });
  } else {
    uploadPromise = facade.upload(bucketId, params.mnemonic, file, {
      uploadingCallback: params.progressCallback,
      abortController: uploadAbortController,
    });
  }

  return uploadPromise
    .catch((err: ErrorWithContext) => {
      if (connectionLost) {
        throw new ConnectionLostError();
      }

      Sentry.captureException(err, { extra: err.context });

      Sentry.captureException(err, { extra: err.context });

      throw err;
    })
    .finally(() => {
      console.timeEnd('multipart-upload');
    });
}
