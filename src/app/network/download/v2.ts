import { sha256 } from '../crypto';
import { NetworkWeb } from '@internxt/network-web';
const { downloadFile: downloadFileNetwork, NetworkFacade } = NetworkWeb;

type DownloadProgressCallback = (totalBytes: number, downloadedBytes: number) => void;
type FileStream = ReadableStream<Uint8Array>;
type DownloadFileResponse = Promise<FileStream>;
type DownloadFileOptions = { notifyProgress: DownloadProgressCallback; abortController?: AbortController };
interface NetworkCredentials {
  user: string;
  pass: string;
}

interface DownloadFileParams {
  bucketId: string;
  fileId: string;
  options?: DownloadFileOptions;
}

interface DownloadOwnFileParams extends DownloadFileParams {
  creds: NetworkCredentials;
  mnemonic: string;
  token?: never;
  encryptionKey?: never;
}

interface DownloadSharedFileParams extends DownloadFileParams {
  creds?: never;
  mnemonic?: never;
  token: string;
  encryptionKey: string;
}

type DownloadSharedFileFunction = (params: DownloadSharedFileParams) => DownloadFileResponse;
type DownloadOwnFileFunction = (params: DownloadOwnFileParams) => DownloadFileResponse;
type DownloadFileFunction = (params: DownloadSharedFileParams | DownloadOwnFileParams) => DownloadFileResponse;

const prependProxyToDownloadableUrl = (url: string): string => {
  const useProxy = process.env.REACT_APP_DONT_USE_PROXY !== 'true' && !new URL(url).hostname.includes('internxt');
  return (useProxy ? process.env.REACT_APP_PROXY + '/' : '') + url;
};

const downloadSharedFile: DownloadSharedFileFunction = (params) => {
  const { bucketId, fileId, encryptionKey, token, options } = params;

  const facade = new NetworkFacade(
    process.env.REACT_APP_STORJ_BRIDGE as string,
    {
      clientName: 'drive-web',
      clientVersion: '1.0',
    },
    {
      bridgeUser: '',
      userId: '',
    },
  );
  return downloadFileNetwork(facade, bucketId, fileId, '', {
    key: Buffer.from(encryptionKey, 'hex'),
    token,
    downloadingCallback: options?.notifyProgress,
    abortController: options?.abortController,
    configureDownloadableUrl: prependProxyToDownloadableUrl,
  });
};

function getAuthFromCredentials(creds: NetworkCredentials): { username: string; password: string } {
  return {
    username: creds.user,
    password: sha256(Buffer.from(creds.pass)).toString('hex'),
  };
}

const downloadOwnFile: DownloadOwnFileFunction = (params) => {
  const { bucketId, fileId, mnemonic, options } = params;
  const auth = getAuthFromCredentials(params.creds);

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
  return downloadFileNetwork(facade, bucketId, fileId, mnemonic, {
    downloadingCallback: options?.notifyProgress,
    abortController: options?.abortController,
    configureDownloadableUrl: prependProxyToDownloadableUrl,
  });
};

const downloadFile: DownloadFileFunction = (params) => {
  if (params.token && params.encryptionKey) {
    return downloadSharedFile(params);
  } else if (params.creds && params.mnemonic) {
    return downloadOwnFile(params);
  } else {
    throw new Error('DOWNLOAD ERRNO. 0');
  }
};

export default downloadFile;
