import { Abortable } from '@internxt/inxt-js/build/api';
import { WORKER_MESSAGE_STATES } from '../../../../WebWorker';
import DatabaseUploadRepository from '../../../repositories/DatabaseUploadRepository';
import { TaskStatus } from '../../../tasks/types';
import { IUploadParams } from '../network.service';

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

const handleError = ({ msgData, reject, worker }) => {
  reject(msgData.error);
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

const messageResultHandlers = {
  [WORKER_MESSAGE_STATES.SUCCESS]: handleSuccess,
  [WORKER_MESSAGE_STATES.ERROR]: handleError,
  [WORKER_MESSAGE_STATES.ABORT]: handleAbort,
  [WORKER_MESSAGE_STATES.CHECK_UPLOAD_STATUS]: handleCheckUploadStatus,
};

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
const handleMessage = (msgData, params, resolve, reject, worker, continueUploadOptions) => {
  if (msgData.progress) {
    handleProgress({ msgData, params });
    return;
  }

  const messageHandler = messageResultHandlers[msgData.result];

  if (messageHandler) {
    messageHandler({ msgData, resolve, reject, worker, continueUploadOptions });
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
 *
 * @returns {[Promise<string>, Abortable | undefined]} A tuple containing a Promise that resolves to a file ID
 * and an Abortable object for aborting the upload (if applicable).
 */
const createWorkerMessageHandlerPromise = (
  worker: Worker,
  params: IUploadParams,
  continueUploadOptions: {
    taskId: string;
  },
): [Promise<string>, Abortable | undefined] => {
  return [
    new Promise((resolve, reject) => {
      worker.addEventListener('error', reject);
      worker.addEventListener('message', (msg) => {
        console.log('[MAIN_THREAD]: Message received from worker', msg);
        handleMessage(msg.data, params, resolve, reject, worker, continueUploadOptions);
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
