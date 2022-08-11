import * as Sentry from '@sentry/react';
import { ErrorWithContext } from '@internxt/sdk/dist/network/errors';

import { sha256 } from './crypto';
import { NetworkWeb } from '@internxt/network-web/_bundles/prod';
const { uploadFile: uploadFileNetworkWeb, NetworkFacade } = NetworkWeb;

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
  parts?: number;
}

export function uploadFileBlob(
  encryptedFile: Blob,
  url: string,
  opts: {
    progressCallback: UploadProgressCallback;
    abortController?: AbortController;
  },
): Promise<XMLHttpRequest> {
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

  const uploadFinishedPromise = new Promise<XMLHttpRequest>((resolve, reject) => {
    uploadRequest.onload = () => {
      if (uploadRequest.status !== 200) {
        return reject(
          new Error('Upload failed with code ' + uploadRequest.status + ' message ' + uploadRequest.response),
        );
      }
      resolve(uploadRequest);
    };
    uploadRequest.onerror = reject;
    uploadRequest.onabort = () => reject(new Error('Upload aborted'));
    uploadRequest.ontimeout = () => reject(new Error('Request timeout'));
  });

  uploadRequest.open('PUT', url);
  // ! Uncomment this line for multipart to work:
  // uploadRequest.setRequestHeader('Content-Type', '');
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

  const facade = new NetworkFacade(
    process.env.REACT_APP_STORJ_BRIDGE as string,
    {
      clientName: 'drive-web',
      clientVersion: '1.0',
    },
    {
      bridgeUser: auth.username,
      userId: auth.password,
    },
  );
  // const facade = new NetworkFacade(
  //   Network.client(
  //     process.env.REACT_APP_STORJ_BRIDGE as string,
  //     {
  //       clientName: 'drive-web',
  //       clientVersion: '1.0',
  //     },
  //     {
  //       bridgeUser: auth.username,
  //       userId: auth.password,
  //     },
  //   ),
  // );

  if (params.parts) {
    return uploadFileNetworkWeb(facade, bucketId, params.mnemonic, file, {
      uploadingCallback: params.progressCallback,
      abortController: params.abortController,
      chunkSize: file.size / params.parts,
    }).catch((err: ErrorWithContext) => {
      Sentry.captureException(err, { extra: err.context });

      throw err;
    });
  }

  return (
    uploadFileNetworkWeb(facade, bucketId, params.mnemonic, file, {
      uploadingCallback: params.progressCallback,
      abortController: params.abortController,
    })
      // facade
      // .upload(bucketId, params.mnemonic, file, {
      //   uploadingCallback: params.progressCallback,
      //   abortController: params.abortController,
      // })
      .catch((err: ErrorWithContext) => {
        Sentry.captureException(err, { extra: err.context });

        throw err;
      })
  );
}
