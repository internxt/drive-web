export const createUploadWebWorker = (): Worker => {
  return new Worker(new URL('./upload.worker', import.meta.url), { type: 'module' });
};

export const WORKER_MESSAGE_STATES = {
  SUCCESS: 'success',
  ERROR: 'error',
  ERROR_UPLOAD_FILE: 'error_upload_file',
  ABORT: 'abort',
  CHECK_UPLOAD_STATUS: 'checkUploadStatus',
  UPLOAD_STATUS: 'uploadStatus',
};
