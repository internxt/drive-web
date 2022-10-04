import * as Sentry from '@sentry/react';
import { ErrorWithContext } from '@internxt/sdk/dist/network/errors';
import { sha256 } from './crypto';
import { NetworkWeb } from '@internxt/network-web';
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

function getAuthFromCredentials(creds: NetworkCredentials): { username: string; password: string } {
  return {
    username: creds.user,
    password: sha256(Buffer.from(creds.pass)).toString('hex'),
  };
}

export async function uploadFile(bucketId: string, params: IUploadParams): Promise<string> {
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

  return uploadFileNetworkWeb(facade, bucketId, params.mnemonic, file, {
    uploadingCallback: params.progressCallback,
    abortController: params.abortController,
    chunkSize: 100 * 1024 * 1024, // 100 MB
  }).catch((err: ErrorWithContext) => {
    Sentry.captureException(err, { extra: err.context });

    throw err;
  });
}
