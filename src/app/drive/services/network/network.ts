import { Environment } from '@internxt/inxt-js';
import { ActionState, FileInfo } from '@internxt/inxt-js/build/api';
import { Readable } from 'stream';
import localStorageService from '../../../core/services/local-storage.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { TeamsSettings } from '../../../teams/types';
import { Sha256 } from 'asmcrypto.js';
import { createCipheriv, randomBytes } from 'crypto';
import { request } from 'https';
import { finishUpload, getUploadUrl, prepareUpload } from './requests';
import { calculateEncryptedFileHash, uploadFile } from './upload';
import { createAES256Cipher, encryptFilename } from './crypto';
import { v4 } from 'uuid';

export const MAX_ALLOWED_UPLOAD_SIZE = 50 * 1024 * 1024 * 1024;

type ProgressCallback = (progress: number, uploadedBytes: number | null, totalBytes: number | null) => void;
interface IUploadParams {
  filesize: number;
  filecontent: File;
  progressCallback: ProgressCallback;
}

interface IDownloadParams {
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
    const promise: Promise<string> = new Promise((res, rej) => {
      setTimeout(() => rej(), 100000000);
    });

    this.doUpload(bucketId, params);

    // this.uploadTest(params.filecontent).then(() => {
    // const fileToHashStream = params.filecontent.stream().getReader();
    // const fileToUploadStream = params.filecontent.stream().getReader();

    // const sourceToHash = new PassThrough();
    // const sourceToUpload = new PassThrough();

    // (async () => {
    //   let done = false;
    //   let writeOk = false;

    //   while (!done) {
    //     const status = await fileToHashStream.read();

    //     if (!status.done) {
    //       writeOk = sourceToHash.write(status.value);
    //       if (!writeOk) {
    //         await new Promise(r => sourceToHash.once('drain', r));
    //       }
    //     }

    //     done = status.done;
    //   }

    //   sourceToHash.end();
    // })();

    // (async () => {
    //   let done = false;
    //   let writeOk = false;

    //   while (!done) {
    //     const status = await fileToUploadStream.read();

    //     if (!status.done) {
    //       writeOk = sourceToUpload.write(status.value);
    //       if (!writeOk) {
    //         await new Promise(r => sourceToUpload.once('drain', r));
    //       }
    //     }

    //     done = status.done;
    //   }

    //   sourceToUpload.end();
    // })();

    // promise = new Promise((resolve: (fileId: string) => void, reject) => {
    //   actionState = this.environment.upload(
    //     bucketId,
    //     {
    //       name: uuid.v4(),
    //       progressCallback: params.progressCallback,
    //       encryptProgressCallback: (progress: number) => {
    //         console.log('Encrypt progress is %s%', (progress * 100).toFixed(2));
    //       },
    //       finishedCallback: (err, fileId) => {
    //         if (err) {
    //           return reject(err);
    //         }

    //         if (!fileId) {
    //           return reject(Error('File not created'));
    //         }

    //         resolve(fileId);
    //       },
    //     },
    //     {
    //       label: 'OneShardOnly',
    //       params: {
    //         sourceToHash: {
    //           stream: sourceToHash,
    //           size: params.filesize,
    //         },
    //         sourceToUpload: {
    //           stream: sourceToUpload,
    //           size: params.filesize
    //         },
    //         useProxy: process.env.REACT_APP_DONT_USE_PROXY !== 'true'
    //       },
    //     },
    //   );
    // });
    // });

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

  async doUpload(bucketId: string, params: IUploadParams): Promise<string> {
    const file: File = params.filecontent;
    const frameId = await prepareUpload(bucketId, this.creds);

    console.log('Frame ID %s', frameId);

    const index = randomBytes(32);
    const key = await generateFileKey(this.mnemonic, bucketId, index);
    const iv = index.slice(0, 16);

    console.log('INDEX %s', index.toString('hex'));
    console.log('KEY %s', key.toString('hex'));
    console.log('IV %s', iv.toString('hex'));

    const fileHash = await calculateEncryptedFileHash(file, createAES256Cipher(key, iv));
    console.log('FILE_HASH %s', fileHash);

    const shardMeta = {
      hash: fileHash,
      index: 0,
      parity: false,
      size: params.filesize,
    };

    console.log('PARTIAL SHARD META', JSON.stringify(shardMeta));

    const uploadUrl = await getUploadUrl(frameId, shardMeta, this.creds);

    console.log('UPLOAD URL %s', uploadUrl);
    return '';
    await uploadFile(file, createAES256Cipher(key, iv), uploadUrl);

    // const encryptedFilename = await encryptFilename(this.mnemonic, bucketId, v4());
    // return finishUpload(this.mnemonic, bucketId, frameId, encryptedFilename, index, key, shardMeta, this.creds);
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
          label: 'Dynamic',
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
