import { Network } from '@internxt/sdk/dist/network';
import { getSha256 } from '../../crypto/services/utils';
import { NetworkFacade } from '../NetworkFacade';
import envService from 'services/env.service';
import { MultipartDownload } from './MultipartDownload';
import { FileKey, NetworkCredentials } from 'app/network/types/helper-types';

type DownloadProgressCallback = (totalBytes: number, downloadedBytes: number) => void;
type FileStream = ReadableStream<Uint8Array>;
type DownloadFileResponse = Promise<FileStream>;
type DownloadFileOptions = { notifyProgress: DownloadProgressCallback; abortController?: AbortController };

interface DownloadFileParams {
  bucketId: string;
  fileId: string;
  options?: DownloadFileOptions;
}

interface DownloadOwnFileWithMnemonicParams extends DownloadFileParams {
  creds: NetworkCredentials;
  key: { mnemonic: string; bucketKey?: never };
  token?: never;
  encryptionKey?: never;
}

interface DownloadOwnFileWithBucketKeyParams extends DownloadFileParams {
  creds: NetworkCredentials;
  key: { bucketKey: Buffer; mnemonic?: never };
  token?: never;
  encryptionKey?: never;
}

interface DownloadSharedFileParams extends DownloadFileParams {
  creds?: never;
  key: FileKey;
  token: string;
  encryptionKey: string;
}

type DownloadSharedFileFunction = (params: DownloadSharedFileParams) => DownloadFileResponse;
type DownloadFileFunction = (
  params: DownloadSharedFileParams | DownloadOwnFileWithMnemonicParams | DownloadOwnFileWithBucketKeyParams,
) => DownloadFileResponse;

const downloadSharedFile: DownloadSharedFileFunction = (params) => {
  const { bucketId, fileId, encryptionKey, token, options } = params;

  return new NetworkFacade(
    Network.client(
      envService.getVariable('storjBridge'),
      {
        clientName: 'drive-web',
        clientVersion: '1.0',
      },
      {
        bridgeUser: '',
        userId: '',
      },
    ),
  ).download(bucketId, fileId, '', {
    key: Buffer.from(encryptionKey, 'hex'),
    token,
    downloadingCallback: options?.notifyProgress,
    abortController: options?.abortController,
  });
};

async function getAuthFromCredentials(creds: NetworkCredentials): Promise<{ username: string; password: string }> {
  return {
    username: creds.user,
    password: await getSha256(creds.pass),
  };
}

const downloadOwnFile = async (params: DownloadOwnFileWithMnemonicParams) => {
  const {
    bucketId,
    fileId,
    key: { mnemonic },
    options,
  } = params;
  const auth = await getAuthFromCredentials(params.creds);

  return new NetworkFacade(
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
  ).download(bucketId, fileId, mnemonic, {
    downloadingCallback: options?.notifyProgress,
    abortController: options?.abortController,
  });
};

const downloadOwnFileWithBucketKey = async (params: DownloadOwnFileWithBucketKeyParams) => {
  const {
    bucketId,
    fileId,
    key: { bucketKey },
    options,
  } = params;
  const auth = await getAuthFromCredentials(params.creds);

  return new NetworkFacade(
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
  ).downloadWithBucketKey(bucketId, fileId, bucketKey, {
    downloadingCallback: options?.notifyProgress,
    abortController: options?.abortController,
  });
};

export async function multipartDownload(
  params: DownloadOwnFileWithMnemonicParams & { fileSize: number },
): Promise<FileStream> {
  const {
    bucketId,
    fileId,
    key: { mnemonic },
    fileSize,
    options,
  } = params;
  const auth = await getAuthFromCredentials(params.creds);

  const networkFacade = new NetworkFacade(
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

  const multipartDownload = new MultipartDownload(networkFacade);

  return multipartDownload.downloadFile({
    bucketId,
    fileId,
    mnemonic,
    fileSize,
    options: {
      downloadingCallback: options?.notifyProgress,
      abortController: options?.abortController,
    },
  });
}

export async function downloadChunkFile(
  params: DownloadOwnFileWithMnemonicParams & { chunkStart: number; chunkEnd: number },
): Promise<FileStream> {
  const {
    bucketId,
    fileId,
    key: { mnemonic },
    chunkStart,
    chunkEnd,
    options,
  } = params;
  const auth = await getAuthFromCredentials(params.creds);

  return new NetworkFacade(
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
  ).downloadChunk({
    bucketId,
    fileId,
    mnemonic,
    chunkStart,
    chunkEnd,
    options: {
      downloadingCallback: options?.notifyProgress,
      abortController: options?.abortController,
    },
  });
}

const downloadFile: DownloadFileFunction = (params) => {
  if (params.token && params.encryptionKey) {
    return downloadSharedFile(params);
  } else if (params.creds && params.key.mnemonic) {
    return downloadOwnFile(params as DownloadOwnFileWithMnemonicParams);
  } else if (params.creds && params.key.bucketKey) {
    return downloadOwnFileWithBucketKey(params as DownloadOwnFileWithBucketKeyParams);
  } else {
    throw new Error('DOWNLOAD ERRNO. 0');
  }
};

export default downloadFile;
