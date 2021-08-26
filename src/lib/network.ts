import { Environment } from '@internxt/inxt-js';
import { createHash } from 'crypto';
import localStorageService from '../services/local-storage.service';
import { TeamsSettings, UserSettings } from '../models/interfaces';

type ProgressCallback = (progress: number, uploadedBytes: number | null, totalBytes: number | null) => void;

interface IUploadParams {
  filesize: number,
  filepath: string,
  filecontent: Blob,
  progressCallback: ProgressCallback;
}

interface IDownloadParams {
  fileToken?: string;
  fileEncryptionKey?: Buffer;
  progressCallback: ProgressCallback;
}

interface EnvironmentConfig {
  bridgeUser: string,
  bridgePass: string,
  encryptionKey: string,
  bucketId: string
}

export class Network {
  private environment: Environment;
  private bridgeUrl = 'https://api.internxt.com';

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

    this.environment = new Environment({ bridgePass, bridgeUser, encryptionKey, bridgeUrl: this.bridgeUrl });
  }

  /**
   * Uploads a file to the Internxt Network
   * @param bucketId Bucket where file is going to be uploaded
   * @param params Required params for uploading a file
   * @returns Id of the created file
   */
  uploadFile(bucketId: string, params: IUploadParams): Promise<string> {
    if (!bucketId) {
      throw new Error('Bucket id not provided');
    }

    const hashName = createHash('ripemd160').update(params.filepath).digest('hex');

    return new Promise((resolve: (fileId: string) => void, reject) => {
      this.environment.uploadFile(bucketId, {
        filename: hashName,
        fileSize: params.filesize,
        fileContent: params.filecontent,
        progressCallback: params.progressCallback,
        finishedCallback: (err, fileId) => {
          if (err) {
            return reject(err);
          }

          if (!fileId) {
            return reject(Error('File not created'));
          }

          resolve(fileId);
        }
      });
    });
  }

  /**
   * Downloads a file from the Internxt Network
   * @param bucketId Bucket where file is uploaded
   * @param fileId Id of the file to be downloaded
   * @param params Required params for downloading a file
   * @returns
   */
  downloadFile(bucketId: string, fileId: string, params: IDownloadParams): Promise<Blob> {
    if (!bucketId) {
      throw new Error('Bucket id not provided');
    }

    if (!fileId) {
      throw new Error('File id not provided');
    }

    return new Promise((resolve, reject) => {
      this.environment.downloadFile(bucketId, fileId, {
        ...params,
        finishedCallback: (err: Error | null, filecontent: Blob | null) => {
          if (err) {
            //STATUS: ERROR DOWNLOAD FILE
            return reject(err);
          }

          if (!filecontent) {
            return reject(Error('Downloaded file is empty'));
          }

          resolve(filecontent);
        }
      });
    });
  }

  getFileInfo(bucketId: string, fileId: string) {
    return this.environment.getFileInfo(bucketId, fileId);
  }

  createFileToken(bucketId: string, fileId: string, operation: 'PULL' | 'PUSH'): Promise<string> {
    return this.environment.createFileToken(bucketId, fileId, operation);
  }
}

/**
 * Returns required config to upload files to the Internxt Network
 * @param isTeam Flag to indicate if is a team or not
 * @returns
 */
export function getEnvironmentConfig(isTeam?: boolean): EnvironmentConfig {
  if (isTeam) {
    const team = localStorageService.getTeams() as TeamsSettings;

    return {
      bridgeUser: team.bridge_user,
      bridgePass: team.bridge_password,
      encryptionKey: team.bridge_mnemonic,
      bucketId: team.bucket
    };
  }

  const user = localStorageService.getUser() as UserSettings;

  return {
    bridgeUser: user.email,
    bridgePass: user.userId,
    encryptionKey: user.mnemonic,
    bucketId: user.bucket
  };
}

export const generateFileKey = Environment.utils.generateFileKey;
