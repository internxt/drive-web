import { Network } from '@internxt/sdk/dist/network';
import { getSha256 } from '../../crypto/services/utils';
import { NetworkFacade } from '../NetworkFacade';
import envService from 'app/core/services/env.service';
import { MultipartDownload } from './MultipartDownload';
import { UnknownDownloadError } from '../errors/download.errors';

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
  fileSize: number;
  options?: DownloadFileOptions;
}

export interface DownloadOwnFileParams extends DownloadFileParams {
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

export class DownloadV2 {
  downloadSharedFile: DownloadSharedFileFunction = (params) => {
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

  public async getAuthFromCredentials(creds: NetworkCredentials): Promise<{ username: string; password: string }> {
    return {
      username: creds.user,
      password: await getSha256(creds.pass),
    };
  }

  downloadOwnFile: DownloadOwnFileFunction = async (params) => {
    const { bucketId, fileId, mnemonic, options } = params;
    const auth = await this.getAuthFromCredentials(params.creds);

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

  multipartDownload = async (params) => {
    const { bucketId, fileId, mnemonic, fileSize, options } = params;
    const auth = await this.getAuthFromCredentials(params.creds);

    const networkFacade = new NetworkFacade(
      Network.client(
        envService.getVariable('storjBridge'),
        {
          clientName: 'drive-web',
          clientVersion: '1.0',
        },
        {
          bridgeUser: params.creds ? auth.username : '',
          userId: params.creds ? auth.password : '',
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
        downloadingCallback: options.notifyProgress,
        abortController: options.abortController,
      },
    });
  };

  downloadFile: DownloadFileFunction = (params) => {
    if (params.token && params.encryptionKey) {
      return this.downloadSharedFile(params);
    } else if (params.creds && params.mnemonic) {
      return this.downloadOwnFile(params);
    } else {
      throw new UnknownDownloadError();
    }
  };
}

export const downloadFileV2 = new DownloadV2();
