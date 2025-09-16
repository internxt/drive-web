vi.mock('../download.service/downloadAsBlob', () => ({
  downloadAsBlob: vi.fn(),
  getBlobWritable: vi.fn(),
}));

vi.mock('../download.service/downloadFileFromBlob', () => ({
  default: vi.fn(),
}));

import { describe, test, expect, vi, Mock, beforeEach } from 'vitest';
import { downloadWorkerHandler } from './downloadWorkerHandler';
import { DriveFileData } from 'app/drive/types';
import { MockWorker } from '../../../../__mocks__/WebWorker';
import * as downloadBlobModule from '../download.service/downloadAsBlob';
import downloadFileFromBlob from '../download.service/downloadFileFromBlob';

const writeMock = vi.fn();
const closeMock = vi.fn();
const abortMock = vi.fn();

vi.mock('streamsaver', () => ({
  createWriteStream: vi.fn().mockImplementation(() => ({
    getWriter: () => ({
      write: writeMock,
      close: closeMock,
      abort: abortMock,
    }),
  })),
}));

describe('Download Worker Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (downloadBlobModule.getBlobWritable as unknown as Mock).mockResolvedValue({
      getWriter: () => ({
        abort: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        write: vi.fn().mockResolvedValue(undefined),
        closed: Promise.resolve(undefined),
        desiredSize: 1024,
        ready: Promise.resolve(undefined),
        releaseLock: vi.fn(),
      }),
      locked: false,
      abort: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    });

    (downloadBlobModule.downloadAsBlob as unknown as Mock).mockResolvedValue(undefined);

    (downloadFileFromBlob as unknown as Mock).mockResolvedValue(undefined);
  });

  describe('Aborting the download', () => {
    test('When downloading the file using chunks is aborted, then the worker is terminated and the writer aborted', async () => {
      const mockedWorker = new MockWorker();
      const itemData = {
        fileId: 'random-id',
      } as DriveFileData;
      const abortController = new AbortController();

      const workerHandlerPromise = downloadWorkerHandler.handleWorkerMessages({
        worker: mockedWorker as unknown as Worker,
        itemData,
        abortController,
        updateProgressCallback: vi.fn(),
      });

      mockedWorker.emitMessage({
        result: 'chunk',
        chunk: new Uint8Array([1, 2, 3]),
      });

      abortController.abort();

      await expect(workerHandlerPromise).rejects.toBe('Aborted');
      expect(abortMock).toBeCalled();
      expect(mockedWorker.terminated).toBe(true);
    });

    test('When downloading the file using blob is aborted, then the worker is terminated', async () => {
      const mockedWorker = new MockWorker();
      const itemData = {
        fileId: 'random-id',
        plainName: 'test-file',
        type: 'txt',
      } as DriveFileData;
      const abortController = new AbortController();

      const mockBlobWritable = {
        getWriter: () => ({
          abort: vi.fn().mockResolvedValue(undefined),
          close: vi.fn().mockResolvedValue(undefined),
          write: vi.fn().mockResolvedValue(undefined),
          closed: Promise.resolve(undefined),
          desiredSize: 1024,
          ready: Promise.resolve(undefined),
          releaseLock: vi.fn(),
        }),
        locked: false,
        abort: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      };

      const mockReadableStream = {
        cancel: vi.fn().mockResolvedValue(undefined),
      };

      (downloadBlobModule.getBlobWritable as unknown as Mock).mockResolvedValue(mockBlobWritable);

      (downloadBlobModule.downloadAsBlob as unknown as Mock).mockImplementation(async (source, destination) => {
        return new Promise((resolve, reject) => {
          // We need that to simulate the download
          setTimeout(() => resolve(undefined), 10000);
        });
      });

      const workerHandlerPromise = downloadWorkerHandler.handleWorkerMessages({
        worker: mockedWorker as unknown as Worker,
        itemData,
        abortController,
        updateProgressCallback: vi.fn(),
      });

      mockedWorker.emitMessage({
        result: 'blob',
        readableStream: mockReadableStream as any,
        fileId: itemData.fileId,
      });

      // We need this timeout to simulate the abort while the download is going on
      setTimeout(() => {
        abortController.abort();
      }, 500);

      await expect(workerHandlerPromise).rejects.toBe('Aborted');
      expect(mockBlobWritable.abort).toHaveBeenCalled();
      expect(mockReadableStream.cancel).toHaveBeenCalled();
      expect(mockedWorker.terminated).toBe(true);
    });
  });

  test('When the event is chunk, then the chunk is written to the stream correctly', async () => {
    const mockedWorker = new MockWorker();
    const chunk = new Uint8Array([1, 2, 3]);
    const itemData = {
      fileId: 'random-id',
    } as DriveFileData;

    const workerHandlerPromise = downloadWorkerHandler.handleWorkerMessages({
      worker: mockedWorker as unknown as Worker,
      itemData,
      updateProgressCallback: vi.fn(),
    });

    mockedWorker.emitMessage({
      result: 'chunk',
      chunk,
    });

    mockedWorker.emitMessage({
      result: 'success',
      fileId: itemData.fileId,
    });

    await expect(workerHandlerPromise).resolves.toBe(itemData.fileId);
    expect(writeMock).toBeCalledWith(chunk);
    expect(closeMock).toBeCalled();
    expect(mockedWorker.terminated).toBe(true);
  });

  test('When the event is blob, then the blob is written to the stream correctly', async () => {
    const mockedWorker = new MockWorker();
    const readableStream = new ReadableStream();
    const itemData = {
      fileId: 'random-id',
      plainName: 'random-name',
      type: 'txt',
    } as DriveFileData;
    const completedName = `${itemData.plainName}.${itemData.type}`;

    const workerHandlerPromise = downloadWorkerHandler.handleWorkerMessages({
      worker: mockedWorker as unknown as Worker,
      itemData,
      updateProgressCallback: vi.fn(),
    });

    mockedWorker.emitMessage({
      result: 'blob',
      readableStream,
      fileId: itemData.fileId,
    });

    mockedWorker.emitMessage({
      result: 'success',
      fileId: itemData.fileId,
    });

    await expect(workerHandlerPromise).resolves.toBe(itemData.fileId);
    expect(downloadBlobModule.getBlobWritable).toHaveBeenCalledWith(completedName, expect.any(Function));
    expect(downloadBlobModule.downloadAsBlob).toHaveBeenCalledWith(readableStream, expect.any(Object));
    expect(mockedWorker.terminated).toBe(true);
  });

  test('When the event is progress, then the progress callback is called and the value is updated correctly', async () => {
    const mockedWorker = new MockWorker();
    const itemData = {
      fileId: 'random-id',
    } as DriveFileData;
    const updateProgress = vi.fn();

    const workerHandlerPromise = downloadWorkerHandler.handleWorkerMessages({
      worker: mockedWorker as unknown as Worker,
      itemData,
      updateProgressCallback: updateProgress,
    });
    mockedWorker.emitMessage({
      result: 'progress',
      progress: 0.1,
    });

    expect(updateProgress).toBeCalledWith(0.1);

    mockedWorker.emitMessage({
      result: 'success',
      fileId: itemData.fileId,
    });

    await expect(workerHandlerPromise).resolves.toBe(itemData.fileId);
    expect(mockedWorker.terminated).toBe(true);
  });

  test('When success is called, then the worker is terminated', async () => {
    const mockedWorker = new MockWorker();
    const itemData = {
      fileId: 'random-id',
    } as DriveFileData;

    const workerHandlerPromise = downloadWorkerHandler.handleWorkerMessages({
      worker: mockedWorker as unknown as Worker,
      itemData,
      updateProgressCallback: vi.fn(),
    });

    mockedWorker.emitMessage({
      result: 'success',
      fileId: itemData.fileId,
    });

    await expect(workerHandlerPromise).resolves.toBe(itemData.fileId);
    expect(mockedWorker.terminated).toBe(true);
  });

  test('When the event is error, then the worker is terminated and the error returned', async () => {
    const mockedWorker = new MockWorker();
    const itemData = {
      fileId: 'random-id',
    } as DriveFileData;

    const workerHandlerPromise = downloadWorkerHandler.handleWorkerMessages({
      worker: mockedWorker as unknown as Worker,
      itemData,
      updateProgressCallback: vi.fn(),
    });

    mockedWorker.emitMessage({
      result: 'error',
      error: 'error',
    });

    await expect(workerHandlerPromise).rejects.toBe('error');
    expect(mockedWorker.terminated).toBe(true);
  });
});
