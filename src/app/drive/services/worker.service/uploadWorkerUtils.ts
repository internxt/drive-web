import { Abortable } from 'app/network/Abortable';
import DatabaseUploadRepository from 'app/repositories/DatabaseUploadRepository';
import { TaskStatus } from 'app/tasks/types';
import { IUploadParams } from '../network.service/types';
import { WORKER_MESSAGE_STATES } from './types/upload';

/**
 * A working upload worker keeps talking: it asks for the upload status, reports progress and polls every
 * second while paused. A worker silent for this long is stuck and will never answer.
 */
export const UPLOAD_WORKER_INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000;

export class UploadWorkerUnresponsiveError extends Error {
  constructor() {
    super('The upload worker stopped responding');
    this.name = 'UploadWorkerUnresponsiveError';
  }
}

/**
 * Checks the upload progress for the specified task.
 *
 * @param {string} taskId - The identifier of the task for which the progress is checked.
 *
 * @param {(value: void | PromiseLike<void>) => void} resolve - The outer promise resolution function.
 */
const checkProgress = async (taskId: string, resolve: (value: void | PromiseLike<void>) => void) => {
  let beginProgress = false;

  /**
   * Handles received messages.
   *
   * @param {MessageEvent} msg - The received message event.
   */
  const handleMessage = (msg: MessageEvent) => {
    if (msg.data.result === 'uploadStatus') {
      if (taskId === msg.data.uploadStatus.taskId) {
        beginProgress = msg.data.uploadStatus.status === TaskStatus.InProcess;
      }
    }
  };

  addEventListener('message', handleMessage);

  while (!beginProgress) {
    postMessage({ result: 'checkUploadStatus' });
    await new Promise((timeoutResolve) => setTimeout(timeoutResolve, 1000));
  }

  removeEventListener('message', handleMessage);
  resolve();
};

/**
 * Waits for a signal to continue the upload for the specified task.
 *
 * @param {string} taskId - The identifier of the task for which the upload continuation signal is awaited.
 *
 * @returns {Promise<void>} - A promise that resolves once the upload continuation signal is received.
 */
function waitForContinueUploadSignal(taskId: string): Promise<void> {
  return new Promise((resolve) => {
    checkProgress(taskId, resolve);
  });
}

const handleProgress = ({ msgData, params }) => {
  params.progressCallback(msgData.progress, msgData.uploadedBytes, msgData.totalBytes);
};

const handleSuccess = ({ msgData, resolve, worker }) => {
  resolve(msgData.fileId);
  worker.terminate();
};

const handleError = ({ msgData, params, resolve, reject, worker }) => {
  //if upload is from folder, resolve promise to continue uploading
  params.isUploadedFromFolder ? resolve(msgData.fileId) : reject(msgData.error);
  worker.terminate();
};

const handleAbort = ({ msgData, reject, worker }) => {
  console.warn('[MAIN_THREAD]: ABORT SIGNAL', msgData.fileId);
  reject(msgData.result);
  worker.terminate();
};

const handleCheckUploadStatus = async ({ continueUploadOptions, worker }) => {
  const uploadRespository = DatabaseUploadRepository.getInstance();

  const uploadStatus = await uploadRespository.getUploadState(continueUploadOptions.taskId);

  worker.postMessage({
    result: WORKER_MESSAGE_STATES.UPLOAD_STATUS,
    uploadStatus: { status: uploadStatus, taskId: continueUploadOptions.taskId },
  });
};

const buildMessageResultHandlers = (onRateLimited: () => void) => ({
  [WORKER_MESSAGE_STATES.SUCCESS]: handleSuccess,
  [WORKER_MESSAGE_STATES.ERROR]: handleError,
  [WORKER_MESSAGE_STATES.ABORT]: handleAbort,
  [WORKER_MESSAGE_STATES.CHECK_UPLOAD_STATUS]: handleCheckUploadStatus,
  [WORKER_MESSAGE_STATES.RATE_LIMITED]: () => onRateLimited(),
});

/**
 * Handles messages received from the Web Worker.
 *
 * @param {Object} msgData - The data of the received message.
 * @param {IUploadParams} params - Upload parameters.
 * @param {Function} resolve - Function to resolve the Promise.
 * @param {Function} reject - Function to reject the Promise.
 * @param {Worker} worker - The Web Worker instance.
 * @param {Object} continueUploadOptions - Options for continuing an upload.
 */
const handleMessage = (msgData, params, resolve, reject, worker, continueUploadOptions, onRateLimited: () => void) => {
  if (msgData.progress) {
    handleProgress({ msgData, params });
    return;
  }

  const messageHandler = buildMessageResultHandlers(onRateLimited)[msgData.result];

  if (messageHandler) {
    messageHandler({ msgData, params, resolve, reject, worker, continueUploadOptions });
    return;
  }

  console.warn('[MAIN_THREAD]: Received unknown message from worker');
};

/**
 * Creates a Promise that resolves or rejects based on messages received from a Web Worker.
 *
 * @param {Worker} worker - The Web Worker instance.
 * @param {IUploadParams} params - Upload parameters.
 * @param {Object} continueUploadOptions - Options for continuing an upload.
 * @param {string} continueUploadOptions.taskId - The task ID for continuing the upload.
 * @param {Function} onRateLimited - Callback invoked when the worker signals a rate limit.
 *
 * @returns {[Promise<string>, Abortable | undefined]} A tuple containing a Promise that resolves to a file ID
 * and an Abortable object for aborting the upload (if applicable). The promise rejects with
 * {@link UploadWorkerUnresponsiveError} and the worker is terminated when it goes silent for
 * {@link UPLOAD_WORKER_INACTIVITY_TIMEOUT_MS}, so a stuck worker never leaves the upload pending forever.
 */
const createWorkerMessageHandlerPromise = (
  worker: Worker,
  params: IUploadParams,
  continueUploadOptions: {
    taskId: string;
  },
  onRateLimited: () => void,
): [Promise<string>, Abortable | undefined] => {
  return [
    new Promise((resolve, reject) => {
      let inactivityTimer: ReturnType<typeof setTimeout> | undefined;
      let isSettled = false;

      const settleWith =
        <T>(settle: (value: T) => void) =>
        (value: T) => {
          isSettled = true;
          clearTimeout(inactivityTimer);
          settle(value);
        };
      const resolveUpload = settleWith(resolve);
      const rejectUpload = settleWith(reject);

      const restartInactivityTimer = () => {
        clearTimeout(inactivityTimer);
        if (isSettled) return;
        inactivityTimer = setTimeout(() => {
          worker.terminate();
          rejectUpload(new UploadWorkerUnresponsiveError());
        }, UPLOAD_WORKER_INACTIVITY_TIMEOUT_MS);
      };

      restartInactivityTimer();
      worker.addEventListener('error', rejectUpload);
      worker.addEventListener('message', (msg) => {
        console.log('[MAIN_THREAD]: Message received from worker', msg);
        restartInactivityTimer();
        handleMessage(msg.data, params, resolveUpload, rejectUpload, worker, continueUploadOptions, onRateLimited);
      });
    }),
    {
      abort: () => {
        worker.postMessage({ type: 'upload', abort: true });
      },
    },
  ];
};

export { createWorkerMessageHandlerPromise, waitForContinueUploadSignal };
