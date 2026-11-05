import { Abortable } from 'app/network/Abortable';
import { createUploadWebWorker } from '../../../../WebWorker';
import { createWorkerMessageHandlerPromise } from '../worker.service/uploadWorkerUtils';
import { notifyUserWithCooldown } from 'app/core/factory/sdk/retryStrategies';
import { IUploadParams } from './types';
import { NetworkCredentials } from 'app/network/types/helper-types';
import { MAX_CONCURRENT_UPLOADS } from 'app/network/networkConstants';
import { createConcurrencyLimiter } from 'utils/concurrencyLimiter';
import { WORKER_MESSAGE_STATES } from '../worker.service/types/upload';

export { getEnvironmentConfig } from './getEnvironmentConfig';

export const MAX_ALLOWED_UPLOAD_SIZE = 100 * 1024 * 1024 * 1024;

/**
 * Every upload worker loads several WebAssembly hashers, and the browser only fits a limited number of
 * WebAssembly memories per tab. Folder uploads run many file uploads in parallel, so the workers are capped
 * app-wide: past the cap the hashers fail with "Out of memory" and the uploads get stuck.
 */
export const MAX_CONCURRENT_UPLOAD_WORKERS = MAX_CONCURRENT_UPLOADS;
const uploadWorkerSlots = createConcurrencyLimiter(MAX_CONCURRENT_UPLOAD_WORKERS);

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

    let isAborted = false;
    let abortWorkerUpload: (() => void) | undefined;

    const upload = uploadWorkerSlots.run(() => {
      if (isAborted) return Promise.reject(WORKER_MESSAGE_STATES.ABORT);

      const worker: Worker = createUploadWebWorker();
      worker.postMessage({ bucketId, params: payload, type: 'upload' });

      const [workerUpload, workerAbortable] = createWorkerMessageHandlerPromise(
        worker,
        params,
        continueUploadOptions,
        notifyUserWithCooldown,
      );
      abortWorkerUpload = workerAbortable?.abort;

      return workerUpload;
    });

    return [
      upload,
      {
        abort: () => {
          isAborted = true;
          abortWorkerUpload?.();
        },
      },
    ];
  }
}
