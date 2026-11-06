import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MockWorker } from '../../../../__mocks__/WebWorker';

const createdWorkers: MockWorker[] = [];

vi.mock('../../../../WebWorker', () => ({
  createUploadWebWorker: vi.fn(() => {
    const worker = new MockWorker();
    createdWorkers.push(worker);
    return worker;
  }),
}));

vi.mock('app/core/factory/sdk/retryStrategies', () => ({
  notifyUserWithCooldown: vi.fn(),
}));

import { MAX_CONCURRENT_UPLOADS } from 'app/network/networkConstants';
import { Network } from '.';

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

const network = new Network('bridge-user', 'bridge-pass', 'mnemonic');

const startUpload = (name: string) => {
  const [upload, abortable] = network.uploadFile(
    'bucket-id',
    { filesize: 10, filecontent: new File(['content'], name), progressCallback: vi.fn() },
    { taskId: `task-${name}` },
  );
  const outcome = vi.fn();
  upload.then(
    (fileId) => outcome({ fileId }),
    (error) => outcome({ error }),
  );
  return { upload, abortable, outcome };
};

const uploadedFileOf = (worker: MockWorker) => worker.messagesSent[0]?.params?.filecontent?.name;
const isWorkerAlive = (worker: MockWorker) => !worker.terminated;

describe('Network uploads', () => {
  beforeEach(() => {
    createdWorkers.length = 0;
  });

  test('When more files are uploaded than the worker limit, then only that many workers run at once', async () => {
    const uploads = Array.from({ length: MAX_CONCURRENT_UPLOADS + 3 }, (_, index) => startUpload(`file-${index}`));
    await flushPromises();

    expect(createdWorkers).toHaveLength(MAX_CONCURRENT_UPLOADS);

    createdWorkers[0].emitMessage({ result: 'success', fileId: 'file-id-0' });
    await flushPromises();

    expect(createdWorkers.filter(isWorkerAlive)).toHaveLength(MAX_CONCURRENT_UPLOADS);
    expect(uploadedFileOf(createdWorkers[MAX_CONCURRENT_UPLOADS])).toBe(`file-${MAX_CONCURRENT_UPLOADS}`);
    await expect(uploads[0].upload).resolves.toBe('file-id-0');

    createdWorkers.filter(isWorkerAlive).forEach((worker) => worker.emitMessage({ result: 'success', fileId: 'id' }));
    await flushPromises();
    createdWorkers.filter(isWorkerAlive).forEach((worker) => worker.emitMessage({ result: 'success', fileId: 'id' }));
    await flushPromises();

    expect(createdWorkers).toHaveLength(MAX_CONCURRENT_UPLOADS + 3);
    uploads.forEach(({ outcome }) => expect(outcome).toHaveBeenCalledTimes(1));
  });

  test('When a file fails, then the next waiting file starts', async () => {
    const uploads = Array.from({ length: MAX_CONCURRENT_UPLOADS + 1 }, (_, index) => startUpload(`file-${index}`));
    await flushPromises();

    createdWorkers[0].emitMessage({ result: 'error', error: { message: 'Upload failed' } });
    await flushPromises();

    expect(uploads[0].outcome).toHaveBeenCalledWith({ error: { message: 'Upload failed' } });
    expect(uploadedFileOf(createdWorkers[MAX_CONCURRENT_UPLOADS])).toBe(`file-${MAX_CONCURRENT_UPLOADS}`);

    createdWorkers.filter(isWorkerAlive).forEach((worker) => worker.emitMessage({ result: 'success', fileId: 'id' }));
    await flushPromises();
  });

  test('When a waiting file is cancelled, then it fails as aborted right away and never starts a worker', async () => {
    const uploads = Array.from({ length: MAX_CONCURRENT_UPLOADS + 1 }, (_, index) => startUpload(`file-${index}`));
    await flushPromises();
    const waitingUpload = uploads[MAX_CONCURRENT_UPLOADS];

    waitingUpload.abortable?.abort();

    await expect(waitingUpload.upload).rejects.toThrow('abort');

    createdWorkers[0].emitMessage({ result: 'success', fileId: 'file-id-0' });
    await flushPromises();
    expect(createdWorkers).toHaveLength(MAX_CONCURRENT_UPLOADS);

    createdWorkers.filter(isWorkerAlive).forEach((worker) => worker.emitMessage({ result: 'success', fileId: 'id' }));
    await flushPromises();
  });

  test('When a worker crashes, then it is terminated and the next waiting file starts', async () => {
    const uploads = Array.from({ length: MAX_CONCURRENT_UPLOADS + 1 }, (_, index) => startUpload(`file-${index}`));
    await flushPromises();
    const crashedWorker = createdWorkers[0];

    crashedWorker.emitError(new Error('Worker crashed'));
    await flushPromises();

    expect(uploads[0].outcome).toHaveBeenCalledWith({ error: new Error('Worker crashed') });
    expect(crashedWorker.terminated).toBe(true);
    expect(createdWorkers.filter(isWorkerAlive)).toHaveLength(MAX_CONCURRENT_UPLOADS);
    expect(uploadedFileOf(createdWorkers[MAX_CONCURRENT_UPLOADS])).toBe(`file-${MAX_CONCURRENT_UPLOADS}`);

    createdWorkers.filter(isWorkerAlive).forEach((worker) => worker.emitMessage({ result: 'success', fileId: 'id' }));
    await flushPromises();
  });

  test('When a running file is cancelled, then its worker is asked to abort', async () => {
    const { abortable, upload } = startUpload('file');
    await flushPromises();
    const [worker] = createdWorkers;

    abortable?.abort();
    worker.emitMessage({ result: 'abort' });

    expect(worker.messagesSent).toContainEqual({ type: 'upload', abort: true });
    await expect(upload).rejects.toBe('abort');
  });
});
