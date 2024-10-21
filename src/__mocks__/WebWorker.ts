export const createUploadWebWorker = (): Worker => {
  return {
    postMessage: jest.fn(),
    terminate: jest.fn(),
    onmessage: jest.fn(),
    onerror: jest.fn(),
  } as unknown as Worker;
};

export const WORKER_MESSAGE_STATES = {
  SUCCESS: 'success',
  ERROR: 'error',
  ABORT: 'abort',
  CHECK_UPLOAD_STATUS: 'checkUploadStatus',
  UPLOAD_STATUS: 'uploadStatus',
};
