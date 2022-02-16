import { Environment } from '@internxt/inxt-js';
import { ActionState, FileInfo } from '@internxt/inxt-js/build/api';
import { Readable } from 'stream';
import localStorageService from '../../core/services/local-storage.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { TeamsSettings } from '../../teams/types';
import * as blobToStream from 'blob-to-stream';
import * as uuid from 'uuid';

export const MAX_ALLOWED_UPLOAD_SIZE = 1024 * 1024 * 1024;

type ProgressCallback = (progress: number, uploadedBytes: number | null, totalBytes: number | null) => void;
interface IUploadParams {
  filesize: number;
  filecontent: Blob;
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
  private environment: Environment;

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

    this.environment = new Environment({
      bridgePass,
      bridgeUser,
      encryptionKey,
      bridgeUrl: process.env.REACT_APP_STORJ_BRIDGE,
    });
  }

  /**
   * Uploads a file to the Internxt Network
   * @param bucketId Bucket where file is going to be uploaded
   * @param params Required params for uploading a file
   * @returns Id of the created file
   */
  uploadFile(bucketId: string, params: IUploadParams): [Promise<string>, ActionState | undefined] {
    let actionState: ActionState | undefined;

    if (!bucketId) {
      throw new Error('Bucket id not provided');
    }

    const promise = new Promise((resolve: (fileId: string) => void, reject) => {
      actionState = this.environment.upload(
        bucketId,
        {
          name: uuid.v4(),
          progressCallback: params.progressCallback,
          finishedCallback: (err, fileId) => {
            if (err) {
              return reject(err);
            }

            if (!fileId) {
              return reject(Error('File not created'));
            }

            resolve(fileId);
          },
        },
        {
          label: 'OneStreamOnly',
          params: {
            source: { size: params.filesize, stream: blobToStream(params.filecontent) },
            useProxy: process.env.REACT_APP_DONT_USE_PROXY !== 'true',
            concurrency: 6,
          },
        },
      );
    });

    return [promise, actionState];
  }

  /**
   * Downloads a file from the Internxt Network
   * @param bucketId Bucket where file is uploaded
   * @param fileId Id of the file to be downloaded
   * @param params Required params for downloading a file
   * @returns
   */
  downloadFile(bucketId: string, fileId: string, params: IDownloadParams): [Promise<Blob>, ActionState | undefined] {
    const [downloadStreamPromise, actionState] = this.getFileDownloadStream(bucketId, fileId, params);

    let errored = false;

    const promise = new Promise<Blob>((resolve, reject) => {
      downloadStreamPromise
        .then((downloadStream) => {
          const chunks: Buffer[] = [];
          downloadStream
            .on('data', (chunk: Buffer) => {
              chunks.push(chunk);
            })
            .once('error', (err) => {
              errored = true;
              reject(err);
            })
            .once('end', () => {
              if (errored) {
                return;
              }
              const uploadedBytes = chunks.reduce((acumm, chunk) => acumm + chunk.length, 0);

              params.progressCallback(1, uploadedBytes, uploadedBytes);
              resolve(new Blob(chunks, { type: 'application/octet-stream' }));
            });
        })
        .catch(reject);
    });

    return [promise, actionState];
  }

  getFileDownloadStream(
    bucketId: string,
    fileId: string,
    params: IDownloadParams,
  ): [Promise<Readable>, ActionState | undefined] {
    let actionState: ActionState | undefined;

    if (!bucketId) {
      throw new Error('Bucket id not provided');
    }

    if (!fileId) {
      throw new Error('File id not provided');
    }

    const promise = new Promise<Readable>((resolve, reject) => {
      actionState = this.environment.download(
        bucketId,
        fileId,
        {
          ...params,
          finishedCallback: (err, downloadStream) => {
            if (err) {
              //STATUS: ERROR DOWNLOAD FILE
              return reject(err);
            }

            if (!downloadStream) {
              return reject(Error('Download stream is empty'));
            }

            resolve(downloadStream);
          },
        },
        {
          label: 'OneStreamOnly',
          params: {
            useProxy: process.env.REACT_APP_DONT_USE_PROXY !== 'true',
            concurrency: 6,
          },
        },
      );
    });

    return [promise, actionState];
  }

  getFileInfo(bucketId: string, fileId: string): Promise<FileInfo> {
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
      bucketId: team.bucket,
      useProxy: process.env.REACT_APP_DONT_USE_PROXY !== 'true',
    };
  }

  const user = localStorageService.getUser() as UserSettings;

  return {
    bridgeUser: user.bridgeUser,
    bridgePass: user.userId,
    encryptionKey: user.mnemonic,
    bucketId: user.bucket,
    useProxy: process.env.REACT_APP_DONT_USE_PROXY !== 'true',
  };
}

export const generateFileKey = Environment.utils.generateFileKey;
