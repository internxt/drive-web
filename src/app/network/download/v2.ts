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

interface DownloadOwnFile extends DownloadFileParams {
  creds: NetworkCredentials;
  key: FileKey;
  token?: never;
}

interface DownloadSharedFileParams extends DownloadFileParams {
  creds?: never;
  key: FileKey;
  token: string;
}

type DownloadSharedFileFunction = (params: DownloadSharedFileParams) => DownloadFileResponse;
type DownloadFileFunction = (params: DownloadSharedFileParams | DownloadOwnFile) => DownloadFileResponse;

const downloadSharedFile: DownloadSharedFileFunction = (params) => {
  console.log('CHECK: downloadSharedFile is called');
  const { bucketId, fileId, key, token, options } = params;

  const networkFacade = new NetworkFacade(
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
  );
  if (key.mnemonic) {
    return networkFacade.download(bucketId, fileId, '', {
      key: Buffer.from(key.mnemonic, 'hex'),
      token,
      downloadingCallback: options?.notifyProgress,
      abortController: options?.abortController,
    });
  }
  if (key.bucketKey) {
    return networkFacade.download(bucketId, fileId, '', {
      key: key.bucketKey,
      token,
      downloadingCallback: options?.notifyProgress,
      abortController: options?.abortController,
    });
  } else {
    throw new Error('DOWNLOAD ERRNO. 1');
  }
};

async function getAuthFromCredentials(creds: NetworkCredentials): Promise<{ username: string; password: string }> {
  return {
    username: creds.user,
    password: await getSha256(creds.pass),
  };
}

const downloadOwnFile = async (params: DownloadOwnFile) => {
  const { bucketId, fileId, key, options } = params;
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

  if (key.mnemonic) {
    return networkFacade.download(bucketId, fileId, key.mnemonic, {
      downloadingCallback: options?.notifyProgress,
      abortController: options?.abortController,
    });
  }
  if (key.bucketKey) {
    return networkFacade.downloadWithBucketKey(bucketId, fileId, key.bucketKey, {
      downloadingCallback: options?.notifyProgress,
      abortController: options?.abortController,
    });
  } else {
    throw new Error('DOWNLOAD ERRNO. 1');
  }
};

export async function multipartDownload(params: DownloadOwnFile & { fileSize: number }): Promise<FileStream> {
  const { bucketId, fileId, key, fileSize, options } = params;
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
    key,
    fileSize,
    options: {
      downloadingCallback: options?.notifyProgress,
      abortController: options?.abortController,
    },
  });
}

export async function downloadChunkFile(
  params: DownloadOwnFile & { chunkStart: number; chunkEnd: number },
): Promise<FileStream> {
  const { bucketId, fileId, key, chunkStart, chunkEnd, options } = params;
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

  return networkFacade.downloadChunk({
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
  if (params.token) {
    console.log('CHECK: downloadSharedFile called with params:', params);
    return downloadSharedFile(params as DownloadSharedFileParams);
  } else if (params.creds) {
    console.log('CHECK: downloadOwnFile called with params:', params);
    return downloadOwnFile(params as DownloadOwnFile);
  } else {
    throw new Error('DOWNLOAD ERRNO. 0');
  }
};

export default downloadFile;
