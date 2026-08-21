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

/**
 * Creates a NetworkFacade for the bridge. Pass auth for downloads of the user's own files;
 * omit it for shared-link downloads, which authenticate through the share token instead.
 */
const createNetworkFacade = (auth?: { username: string; password: string }): NetworkFacade =>
  new NetworkFacade(
    Network.client(
      envService.getVariable('storjBridge'),
      {
        clientName: 'drive-web',
        clientVersion: '1.0',
      },
      {
        bridgeUser: auth?.username ?? '',
        userId: auth?.password ?? '',
      },
    ),
  );

const downloadSharedFile: DownloadSharedFileFunction = (params) => {
  const { bucketId, fileId, encryptionKey, token, options } = params;

  return createNetworkFacade().download(bucketId, fileId, '', {
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

  return createNetworkFacade(auth).download(bucketId, fileId, mnemonic, {
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

  return createNetworkFacade(auth).downloadWithBucketKey(bucketId, fileId, bucketKey, {
    downloadingCallback: options?.notifyProgress,
    abortController: options?.abortController,
  });
};

async function multipartDownloadOwnFile(
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

  return new MultipartDownload(createNetworkFacade(auth)).downloadFile({
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

/**
 * Downloads a shared file in chunks. The mnemonic is intentionally empty: shared downloads
 * authenticate through the share token, and options.key overrides the mnemonic-derived
 * decryption key downstream in NetworkFacade.downloadChunk.
 */
async function multipartDownloadSharedFile(
  params: DownloadSharedFileParams & { fileSize: number },
): Promise<FileStream> {
  const { bucketId, fileId, encryptionKey, token, fileSize, options } = params;

  return new MultipartDownload(createNetworkFacade()).downloadFile({
    bucketId,
    fileId,
    mnemonic: '',
    fileSize,
    options: {
      key: Buffer.from(encryptionKey, 'hex'),
      token,
      downloadingCallback: options?.notifyProgress,
      abortController: options?.abortController,
    },
  });
}

/**
 * Downloads a file in chunks, dispatching to the shared-link flow when the params carry
 * a share token and encryption key, or to the own-file flow when they carry credentials.
 */
export async function multipartDownload(
  params: (DownloadOwnFileWithMnemonicParams | DownloadSharedFileParams) & { fileSize: number },
): Promise<FileStream> {
  const isSharedDownload = Boolean(params.token && params.encryptionKey);
  const isOwnFileDownload = Boolean(params.creds && params.key.mnemonic);

  if (isSharedDownload) {
    return multipartDownloadSharedFile(params as DownloadSharedFileParams & { fileSize: number });
  } else if (isOwnFileDownload) {
    return multipartDownloadOwnFile(params as DownloadOwnFileWithMnemonicParams & { fileSize: number });
  } else {
    throw new Error('DOWNLOAD ERRNO. 0');
  }
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

  return createNetworkFacade(auth).downloadChunk({
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
