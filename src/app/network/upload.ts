import { Network } from '@internxt/sdk/dist/network';
import { ErrorWithContext } from '@internxt/sdk/dist/network/errors';
import * as Sentry from '@sentry/react';
import { getSha256 } from '../crypto/services/utils';
import { NetworkFacade } from './NetworkFacade';
import { ConnectionLostError } from './requests';
import envService from 'services/env.service';
import { MAX_TRIES, RETRY_DELAY, UPLOAD_CHUNK_SIZE, MIN_MULTIPART_SIZE } from './networkConstants';
import { UploadProgressCallback } from './upload-utils';

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
      envService.getVariable('storjBridge'),
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

  const useMultipart = params.filesize > MIN_MULTIPART_SIZE;
  const partSize = UPLOAD_CHUNK_SIZE;

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
