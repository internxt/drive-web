import { Environment } from 'inxt-js';
import { createHash } from 'crypto';
import localStorageService from '../services/localStorage.service';

type ProgressCallback = (progress: number, uploadedBytes: number | null, totalBytes: number | null) => void;

interface IUploadParams {
  filesize: number,
  filepath: string,
  filecontent: Blob,
  progressCallback: ProgressCallback;
}

interface IDownloadParams {
  progressCallback: ProgressCallback;
}

interface EnvironmentConfig {
  bridgeUser: string,
  bridgePass: string,
  encryptionKey: string,
  bucketId: string
}

/**
 * TODO: Change typing in inxt-js and remove this interface
 */
interface CreateEntryFromFrameResponse {
  id: string;
  index: string;
  frame: string;
  bucket: string;
  mimetype: string;
  name: string;
  renewal: string;
  created: string;
  hmac: {
    value: string;
    type: string;
  };
  erasure: {
    type: string;
  };
  size: number;
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

    return new Promise((resolve: (entry: CreateEntryFromFrameResponse) => void, reject) => {
      this.environment.uploadFile(bucketId, {
        filename: hashName,
        fileSize: params.filesize,
        fileContent: params.filecontent,
        progressCallback: params.progressCallback,
        finishedCallback: (err, response) => {
          if (err) {
            return reject(err);
          }

          if (!response) {
            return reject(Error('File not created'));
          }

          resolve(response);
        }
      });
    }).then((uploadRes) => {
      return uploadRes.id;
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
        progressCallback: params.progressCallback,
        finishedCallback: (err: Error | null, filecontent: Blob | null) => {
          if (err) {
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
}

/**
 * Returns required config to upload files to the Internxt Network
 * @param isTeam Flag to indicate if is a team or not
 * @returns
 */
export function getEnvironmentConfig(isTeam?: boolean): EnvironmentConfig {
  if (isTeam) {
    const team = localStorageService.getTeams();

    return {
      bridgeUser: team.bridge_user,
      bridgePass: team.bridge_password,
      encryptionKey: team.bridge_mnemonic,
      bucketId: team.bucket
    };
  }

  const user = localStorageService.getUser();

  return {
    bridgeUser: user.email,
    bridgePass: user.userId,
    encryptionKey: user.mnemonic,
    bucketId: user.bucket
  };
}