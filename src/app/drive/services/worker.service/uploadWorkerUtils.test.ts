import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { MockWorker } from '../../../../__mocks__/WebWorker';
import { IUploadParams } from '../network.service/types';
import {
  createWorkerMessageHandlerPromise,
  UPLOAD_WORKER_INACTIVITY_TIMEOUT_MS,
  UploadWorkerUnresponsiveError,
} from './uploadWorkerUtils';

const startUpload = () => {
  const worker = new MockWorker();
  const params = { progressCallback: vi.fn() } as unknown as IUploadParams;
  const [upload] = createWorkerMessageHandlerPromise(
    worker as unknown as Worker,
    params,
    { taskId: 'task-id' },
    vi.fn(),
  );
  const outcome = vi.fn();
  upload.then(
    (fileId) => outcome({ fileId }),
    (error) => outcome({ error }),
  );

  return { worker, params, upload, outcome };
};

describe('Upload worker messages', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('When the worker never answers, then the upload fails as unresponsive and the worker is terminated', async () => {
    const { worker, upload } = startUpload();

    vi.advanceTimersByTime(UPLOAD_WORKER_INACTIVITY_TIMEOUT_MS);

    await expect(upload).rejects.toBeInstanceOf(UploadWorkerUnresponsiveError);
    expect(worker.terminated).toBe(true);
  });

  test('When the worker stops answering in the middle of the upload, then the upload fails as unresponsive', async () => {
    const { worker, params, upload } = startUpload();

    vi.advanceTimersByTime(UPLOAD_WORKER_INACTIVITY_TIMEOUT_MS - 1);
    worker.emitMessage({ progress: 0.5, uploadedBytes: 50, totalBytes: 100 });
    vi.advanceTimersByTime(UPLOAD_WORKER_INACTIVITY_TIMEOUT_MS);

    expect(params.progressCallback).toHaveBeenCalledWith(0.5, 50, 100);
    await expect(upload).rejects.toBeInstanceOf(UploadWorkerUnresponsiveError);
    expect(worker.terminated).toBe(true);
  });

  test('When the worker keeps reporting progress, then the upload is not considered stuck', async () => {
    const { worker, upload } = startUpload();

    for (let step = 1; step <= 5; step++) {
      vi.advanceTimersByTime(UPLOAD_WORKER_INACTIVITY_TIMEOUT_MS - 1);
      worker.emitMessage({ progress: step / 10, uploadedBytes: step, totalBytes: 10 });
    }
    worker.emitMessage({ result: 'success', fileId: 'file-id' });

    await expect(upload).resolves.toBe('file-id');
  });

  test('When the upload succeeds, then a later silence does not turn it into a failure', async () => {
    const { worker, outcome } = startUpload();

    worker.emitMessage({ result: 'success', fileId: 'file-id' });
    vi.advanceTimersByTime(UPLOAD_WORKER_INACTIVITY_TIMEOUT_MS * 2);
    await vi.runAllTimersAsync();

    expect(outcome).toHaveBeenCalledTimes(1);
    expect(outcome).toHaveBeenCalledWith({ fileId: 'file-id' });
  });

  test('When the worker reports an error, then the upload fails with that error and is not reported again later', async () => {
    const { worker, outcome } = startUpload();

    worker.emitMessage({ result: 'error', error: { message: 'Upload failed' } });
    vi.advanceTimersByTime(UPLOAD_WORKER_INACTIVITY_TIMEOUT_MS * 2);
    await vi.runAllTimersAsync();

    expect(outcome).toHaveBeenCalledTimes(1);
    expect(outcome).toHaveBeenCalledWith({ error: { message: 'Upload failed' } });
  });
});
