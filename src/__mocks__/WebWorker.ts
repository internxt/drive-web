import { vi } from 'vitest';

export const createUploadWebWorker = (): Worker => {
  return {
    postMessage: vi.fn(),
    terminate: vi.fn(),
    onmessage: vi.fn(),
    onerror: vi.fn(),
  } as unknown as Worker;
};

export default {
  createWriteStream: vi.fn().mockImplementation(() => ({
    getWriter: vi.fn().mockReturnValue({
      write: vi.fn(),
      close: vi.fn(),
      abort: vi.fn(),
    }),
  })),
};

export class MockWorker implements Partial<Worker> {
  private listeners: Record<string, ((event: any) => void)[]> = {};
  public messagesSent: any[] = [];
  public terminated = false;

  addEventListener(type: string, callback: (event: any) => void) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(callback);
  }

  removeEventListener(type: string, callback: (event: any) => void) {
    this.listeners[type] = (this.listeners[type] || []).filter((cb) => cb !== callback);
  }

  postMessage(message: any) {
    this.messagesSent.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  emitMessage(dataEvent: any) {
    const event = { data: { ...dataEvent } };
    (this.listeners['message'] || []).forEach((cb) => cb(event));
  }

  emitError(error: any) {
    (this.listeners['error'] || []).forEach((cb) => cb(error));
  }
}

export const WORKER_MESSAGE_STATES = {
  SUCCESS: 'success',
  ERROR: 'error',
  ABORT: 'abort',
  CHECK_UPLOAD_STATUS: 'checkUploadStatus',
  UPLOAD_STATUS: 'uploadStatus',
};
