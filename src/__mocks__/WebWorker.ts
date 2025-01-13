import { vi } from 'vitest';

export const createUploadWebWorker = (): Worker => {
  return {
    postMessage: vi.fn(),
    terminate: vi.fn(),
    onmessage: vi.fn(),
    onerror: vi.fn(),
  } as unknown as Worker;
};

export const WORKER_MESSAGE_STATES = {
  SUCCESS: 'success',
  ERROR: 'error',
  ABORT: 'abort',
  CHECK_UPLOAD_STATUS: 'checkUploadStatus',
  UPLOAD_STATUS: 'uploadStatus',
};
