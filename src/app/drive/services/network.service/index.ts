import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import envService from 'app/core/services/env.service';
import { Abortable } from 'app/network/Abortable';
import { createUploadWebWorker } from '../../../../WebWorker';
import localStorageService from 'app/core/services/local-storage.service';
import { createWorkerMessageHandlerPromise } from '../worker.service/uploadWorkerUtils';
import { EnvironmentConfig, IUploadParams } from './types';

export const MAX_ALLOWED_UPLOAD_SIZE = 40 * 1024 * 1024 * 1024;

export class Network {
  private mnemonic: string;

  private creds: {
    user: string;
    pass: string;
  };

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

    return createWorkerMessageHandlerPromise(worker, params, continueUploadOptions);
  }
}

/**
 * Returns required config to upload files to the Internxt Network
 * @param isTeam Flag to indicate if is a team or not
 * @returns
 */
export function getEnvironmentConfig(isWorkspace?: boolean): EnvironmentConfig {
  const workspaceCredentials = localStorageService.getWorkspaceCredentials();
  const workspace = localStorageService.getB2BWorkspace();

  if (isWorkspace && workspaceCredentials && workspace) {
    return {
      bridgeUser: workspaceCredentials?.credentials?.networkUser,
      bridgePass: workspaceCredentials?.credentials?.networkPass,
      // decrypted mnemonic
      encryptionKey: workspace.workspaceUser.key,
      bucketId: workspaceCredentials?.bucket,
      useProxy: envService.getVariable('dontUseProxy') !== 'true',
    };
  }

  const user = localStorageService.getUser() as UserSettings;

  return {
    bridgeUser: user.bridgeUser,
    bridgePass: user.userId,
    encryptionKey: user.mnemonic,
    bucketId: user.bucket,
    useProxy: envService.getVariable('dontUseProxy') !== 'true',
  };
}
