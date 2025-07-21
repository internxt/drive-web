import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import envService from 'app/core/services/env.service';
import { Abortable } from 'app/network/Abortable';
import { mnemonicToSeed } from 'bip39';
import * as crypto from 'crypto';
import { createUploadWebWorker } from '../../../../WebWorker';
import localStorageService from '../../../core/services/local-storage.service';
import { createWorkerMessageHandlerPromise } from '../worker.service/uploadWorkerUtils';

export const MAX_ALLOWED_UPLOAD_SIZE = 40 * 1024 * 1024 * 1024;

type ProgressCallback = (progress: number, uploadedBytes: number | null, totalBytes: number | null) => void;
export interface IUploadParams {
  filesize: number;
  filecontent: File;
  isUploadedFromFolder?: boolean;
  progressCallback: ProgressCallback;
}

export interface IDownloadParams {
  fileToken?: string;
  fileEncryptionKey?: Buffer;
  progressCallback: ProgressCallback;
}

interface EnvironmentConfig {
  bridgeUser: string;
  bridgePass: string;
  encryptionKey: string;
  bucketId: string;
  useProxy: boolean;
}

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

// ENCRYPTION FOR FILE KEY
export async function generateFileKey(mnemonic: string, bucketId: string, index: Buffer | string): Promise<Buffer> {
  const bucketKey = await generateFileBucketKey(mnemonic, bucketId);

  return getFileDeterministicKey(bucketKey.slice(0, 32), index).slice(0, 32);
}

async function generateFileBucketKey(mnemonic: string, bucketId: string): Promise<Buffer> {
  const seed = await mnemonicToSeed(mnemonic);

  return getFileDeterministicKey(seed, Buffer.from(bucketId, 'hex'));
}

function getFileDeterministicKey(key: Buffer | string, data: Buffer | string): Buffer {
  const hash = crypto.createHash('sha512');
  hash.update(key).update(data);

  return hash.digest();
}
