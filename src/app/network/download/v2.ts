import { Network } from '@internxt/sdk/dist/network';
import { Abortable } from '../Abortable';
import { sha256 } from '../crypto';
import { NetworkFacade } from '../NetworkFacade';

type DownloadProgressCallback = (totalBytes: number, downloadedBytes: number) => void;
type FileStream = ReadableStream<Uint8Array>;
type DownloadFileResponse = [Promise<FileStream>, Abortable];
type DownloadFileOptions = { notifyProgress: DownloadProgressCallback };
interface NetworkCredentials {
  user: string;
  pass: string;
}

interface DownloadFileParams {
  bucketId: string
  fileId: string
  options?: DownloadFileOptions
}

interface DownloadOwnFileParams extends DownloadFileParams {
  creds: NetworkCredentials
  mnemonic: string
  token?: never
  encryptionKey?: never
}

interface DownloadSharedFileParams extends DownloadFileParams {
  creds?: never
  mnemonic?: never
  token: string
  encryptionKey: string
}

type DownloadSharedFileFunction = (params: DownloadSharedFileParams) => DownloadFileResponse;
type DownloadOwnFileFunction = (params: DownloadOwnFileParams) => DownloadFileResponse;
type DownloadFileFunction = (params: DownloadSharedFileParams | DownloadOwnFileParams) => DownloadFileResponse;

const downloadSharedFile: DownloadSharedFileFunction = (params) => {
  const { bucketId, fileId, encryptionKey, token, options } = params;

  const downloadFilePromise = (() => {
    return new NetworkFacade(
      Network.client(
        process.env.REACT_APP_STORJ_BRIDGE as string,
        {
          clientName: 'drive-web',
          clientVersion: '1.0'
        },
        {
          bridgeUser: '',
          userId: ''
        }
      )
    ).download(bucketId, fileId, '', {
      key: Buffer.from(encryptionKey, 'hex'),
      token,
      downloadingCallback: options?.notifyProgress,
    });
  })();

  /* TODO: Abortable download */
  return [downloadFilePromise, { abort: () => null }];
};



function getAuthFromCredentials(creds: NetworkCredentials): { username: string, password: string } {
  return {
    username: creds.user,
    password: sha256(Buffer.from(creds.pass)).toString('hex'),
  };
}

const downloadOwnFile: DownloadOwnFileFunction = (params) => {
  const { bucketId, fileId, mnemonic, options } = params;
  const auth = getAuthFromCredentials(params.creds);

  const downloadFilePromise = (() => {
    return new NetworkFacade(
      Network.client(
        process.env.REACT_APP_STORJ_BRIDGE as string,
        {
          clientName: 'drive-web',
          clientVersion: '1.0'
        },
        {
          bridgeUser: auth.username,
          userId: auth.password
        }
      )
    ).download(bucketId, fileId, mnemonic, {
      downloadingCallback: options?.notifyProgress,
    });
  })();

  /* TODO: Abortable download */
  return [downloadFilePromise, { abort: () => null }];
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
