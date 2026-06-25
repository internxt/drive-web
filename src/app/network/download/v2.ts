import { Network } from '@internxt/sdk/dist/network';
import { getSha256 } from '../../crypto/services/utils';
import { NetworkFacade } from '../NetworkFacade';
import envService from 'services/env.service';
import { MultipartDownload } from './MultipartDownload';
import { FileKey, NetworkCredentials } from 'app/drive/types/helper-types';

type DownloadProgressCallback = (totalBytes: number, downloadedBytes: number) => void;
type FileStream = ReadableStream<Uint8Array>;
type DownloadFileResponse = Promise<FileStream>;
type DownloadFileOptions = { notifyProgress: DownloadProgressCallback; abortController?: AbortController };

interface DownloadFileParams {
  bucketId: string;
  fileId: string;
  options?: DownloadFileOptions;
}

export interface DownloadOwnFileParams extends DownloadFileParams {
  creds: NetworkCredentials;
  key: FileKey;
  token?: never;
}

interface DownloadSharedFileParams extends DownloadFileParams {
  creds?: never;
  key: {
    mnemonic?: never;
    encryptionKey: string;
  };
  token: string;
}

type DownloadSharedFileFunction = (params: DownloadSharedFileParams) => DownloadFileResponse;
type DownloadOwnFileFunction = (params: DownloadOwnFileParams) => DownloadFileResponse;
type DownloadFileFunction = (params: DownloadSharedFileParams | DownloadOwnFileParams) => DownloadFileResponse;

const downloadSharedFile: DownloadSharedFileFunction = (params) => {
  const {
    bucketId,
    fileId,
    key: { encryptionKey },
    token,
    options,
  } = params;

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

const downloadOwnFile: DownloadOwnFileFunction = async (params) => {
  const { bucketId, fileId, key, options } = params;
  const auth = await getAuthFromCredentials(params.creds);
  const mnemonic = key.mnemonic ?? '';

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

export async function multipartDownload(params: DownloadOwnFileParams & { fileSize: number }): Promise<FileStream> {
  const { bucketId, fileId, key, fileSize, options } = params;
  const auth = await getAuthFromCredentials(params.creds);
  const mnemonic = key.mnemonic ?? '';

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
  params: DownloadOwnFileParams & { chunkStart: number; chunkEnd: number },
): Promise<FileStream> {
  const { bucketId, fileId, key, chunkStart, chunkEnd, options } = params;
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
    key,
    chunkStart,
    chunkEnd,
    options: {
      downloadingCallback: options?.notifyProgress,
      abortController: options?.abortController,
    },
  });
}

const downloadFile: DownloadFileFunction = (params) => {
  if (params.token && params.key.encryptionKey) {
    return downloadSharedFile(params);
  } else if (params.creds && params.key.mnemonic) {
    return downloadOwnFile(params);
  } else {
    throw new Error('DOWNLOAD ERRNO. 0');
  }
};

export default downloadFile;
