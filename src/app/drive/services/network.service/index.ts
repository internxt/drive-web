import { Abortable } from 'app/network/Abortable';
import { createUploadWebWorker } from '../../../../WebWorker';
import { createWorkerMessageHandlerPromise } from '../worker.service/uploadWorkerUtils';
import { notifyUserWithCooldown } from 'app/core/factory/sdk/retryStrategies';
import { IUploadParams } from './types';
import { NetworkCredentials } from 'app/network/types/helper-types';

export { getEnvironmentConfig } from './getEnvironmentConfig';

export const MAX_ALLOWED_UPLOAD_SIZE = 40 * 1024 * 1024 * 1024;

export class Network {
  private mnemonic: string;

  private readonly creds: NetworkCredentials;

  constructor(bridgeUser: string, bridgePass: string, encryptionKey: string) {
    if (!bridgeUser) {
      throw new Error('Bridge user not provided');
    }

    if (!bridgePass) {
      throw new Error('Bridge pass not provided');
    }

    if (!encryptionKey) {
      throw new Error('Mnemonic not provided');
    }

    this.creds = {
      user: bridgeUser,
      pass: bridgePass,
    };

    this.mnemonic = encryptionKey;
  }

  /**
   * Uploads a file to the Internxt Network
   * @param bucketId Bucket where file is going to be uploaded
   * @param params Required params for uploading a file
   * @returns Id of the created file
   */
  uploadFile(
    bucketId: string,
    params: IUploadParams,
    continueUploadOptions: {
      taskId: string;
    },
  ): [Promise<string>, Abortable | undefined] {
    if (!bucketId) {
      throw new Error('Bucket id not provided');
    }

    if (params.filesize === 0) {
      throw new Error('File size can not be 0');
    }

    const worker: Worker = createUploadWebWorker();
    const payload: Omit<IUploadParams, 'progressCallback'> & {
      creds: Network['creds'];
      mnemonic: string;
      continueUploadOptions: {
        taskId: string;
        isPaused?: boolean;
      };
    } = {
      filecontent: params.filecontent,
      filesize: params.filesize,
      creds: this.creds,
      mnemonic: this.mnemonic,
      continueUploadOptions,
      isUploadedFromFolder: params.isUploadedFromFolder,
    };

    worker.postMessage({ bucketId, params: payload, type: 'upload' });

    return createWorkerMessageHandlerPromise(worker, params, continueUploadOptions, notifyUserWithCooldown);
  }
}
