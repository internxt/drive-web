import { Network } from '@internxt/sdk/dist/network';
import { ErrorWithContext } from '@internxt/sdk/dist/network/errors';
import * as Sentry from '@sentry/react';

import axios, { AxiosError } from 'axios';
import { getSha256 } from '../crypto/services/utils';
import { NetworkFacade } from './NetworkFacade';
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
  continueUploadOptions?: {
    taskId: string;
    isPaused: boolean;
  };
}

export async function uploadFileBlob(
  content: Blob,
  url: string,
  opts: {
    progressCallback: UploadProgressCallback;
    abortController?: AbortController;
  },
): Promise<{ etag: string | undefined }> {
  try {
    const res = await axios.create()({
      url,
      method: 'PUT',
      data: content,
      headers: {
        'content-type': 'application/octet-stream',
      },
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
    } else if ((error as AxiosError).response && (error as AxiosError)?.response?.status === 403) {
      throw new Error('Request has expired');
    } else if ((error as AxiosError).message === 'Network Error') {
      throw error;
    } else {
      throw new Error('Unknown error');
    }
  }
}

async function getAuthFromCredentials(creds: NetworkCredentials): Promise<{ username: string; password: string }> {
  return {
    username: creds.user,
    password: await getSha256(creds.pass),
  };
}

export async function uploadFile(bucketId: string, params: IUploadParams): Promise<string> {
  const file: File = params.filecontent;

  const auth = await getAuthFromCredentials({
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

  const minimumMultipartThreshold = 100 * 1024 * 1024;
  const useMultipart = params.filesize > minimumMultipartThreshold;
  const partSize = 30 * 1024 * 1024;

  console.time('multipart-upload');

  const uploadAbortController = new AbortController();
  const context = typeof window === 'undefined' ? self : window;

  let connectionLost = false;

  function connectionLostListener() {
    connectionLost = true;
    uploadAbortController.abort();
    context.removeEventListener('offline', connectionLostListener);
  }
  context.addEventListener('offline', connectionLostListener);

  function onAbort() {
    if (!connectionLost) {
      // propagate abort just if the connection is not lost.

      uploadAbortController.abort();
    }

    params.abortController?.signal.removeEventListener('abort', onAbort);
  }

  params.abortController?.signal.addEventListener('abort', onAbort);

  async function retryUpload(): Promise<string> {
    const MAX_TRIES = 3;
    const RETRY_DELAY = 1000;
    let uploadPromise: Promise<string>;
    let lastTryError: unknown;

    for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
      try {
        if (useMultipart) {
          uploadPromise = facade.uploadMultipart(bucketId, params.mnemonic, file, {
            uploadingCallback: params.progressCallback,
            abortController: uploadAbortController,
            parts: Math.ceil(params.filesize / partSize),
            continueUploadOptions: params?.continueUploadOptions,
          });
        } else {
          uploadPromise = facade.upload(bucketId, params.mnemonic, file, {
            uploadingCallback: params.progressCallback,
            abortController: uploadAbortController,
            continueUploadOptions: params?.continueUploadOptions,
          });
        }

        return await uploadPromise;
      } catch (err) {
        if (connectionLost) {
          throw new ConnectionLostError();
        }

        console.warn(`Attempt ${attempt} of ${MAX_TRIES} failed:`, err);
        Sentry.captureException(err, { extra: (err as ErrorWithContext).context });

        const lastTryFailed = attempt === MAX_TRIES;

        if (lastTryFailed) {
          lastTryError = err;
        } else await new Promise((res) => setTimeout(res, RETRY_DELAY));
      }
    }

    throw lastTryError;
  }

  return retryUpload().finally(() => console.timeEnd('multipart-upload'));
}
