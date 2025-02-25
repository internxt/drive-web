export const createUploadWebWorker = (): Worker => {
  return new Worker(new URL('./upload.worker', import.meta.url), { type: 'module' });
};

export const WORKER_MESSAGE_STATES = {
  SUCCESS: 'success',
  ERROR: 'error',
  ABORT: 'abort',
  CHECK_UPLOAD_STATUS: 'checkUploadStatus',
  UPLOAD_STATUS: 'uploadStatus',
};
