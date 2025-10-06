vi.mock('../download.service/downloadFileFromBlob', () => ({
  default: vi.fn(),
}));

import streamSaver from 'streamsaver';
import { describe, test, expect, vi, Mock, beforeEach } from 'vitest';
import { DownloadAbortedByUserError, downloadWorkerHandler } from './downloadWorkerHandler';
import { DriveFileData } from 'app/drive/types';
import { MockWorker } from '../../../../__mocks__/WebWorker';
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

      mockedWorker.emitMessage({
        result: 'abort',
      });

      await expect(workerHandlerPromise).rejects.toThrow(new DownloadAbortedByUserError());
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

      const workerHandlerPromise = downloadWorkerHandler.handleWorkerMessages({
        worker: mockedWorker as unknown as Worker,
        itemData,
        abortController,
        updateProgressCallback: vi.fn(),
      });

      mockedWorker.emitMessage({
        result: 'blob',
        blob: new Blob(['test content']),
      });

      abortController.abort();

      mockedWorker.emitMessage({
        result: 'abort',
      });

      await expect(workerHandlerPromise).rejects.toThrow(new DownloadAbortedByUserError());
      expect(mockedWorker.terminated).toBe(true);
    });

    test('When worker sends abort message, then promise rejects', async () => {
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
        result: 'abort',
      });

      await expect(workerHandlerPromise).rejects.toThrow(new DownloadAbortedByUserError());
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

  test('When the event is blob, then the blob is downloaded correctly', async () => {
    const mockedWorker = new MockWorker();
    const testBlob = new Blob(['test content'], { type: 'text/plain' });
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
      blob: testBlob,
      fileId: itemData.fileId,
    });

    mockedWorker.emitMessage({
      result: 'success',
      fileId: itemData.fileId,
    });

    await expect(workerHandlerPromise).resolves.toBe(itemData.fileId);

    expect(downloadFileFromBlob).toHaveBeenCalledWith(testBlob, completedName);
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

  test('When the event is error and currentWriter exists, then it should abort the writer before terminating', async () => {
    const mockedWorker = new MockWorker();
    const itemData = {
      fileId: 'random-id',
      name: 'test-file',
      type: 'pdf',
    } as DriveFileData;

    const mockAbort = vi.fn();
    const mockWriter = {
      write: vi.fn(),
      abort: mockAbort,
      close: vi.fn(),
    };
    const mockStream = {
      getWriter: vi.fn().mockReturnValue(mockWriter),
    };

    vi.mocked(streamSaver.createWriteStream).mockReturnValue(mockStream as unknown as WritableStream);

    const workerHandlerPromise = downloadWorkerHandler.handleWorkerMessages({
      worker: mockedWorker as unknown as Worker,
      itemData,
      updateProgressCallback: vi.fn(),
    });

    mockedWorker.emitMessage({
      result: 'chunk',
      chunk: new Uint8Array([1, 2, 3]),
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    mockedWorker.emitMessage({
      result: 'error',
      error: 'download failed',
    });

    await expect(workerHandlerPromise).rejects.toBe('download failed');

    expect(mockAbort).toHaveBeenCalled();
    expect(mockedWorker.terminated).toBe(true);
  });

  test('When the event is error and there is an abort controller, then removeEventListener is called', async () => {
    const mockedWorker = new MockWorker();
    const abortController = new AbortController();
    const itemData = {
      fileId: 'random-id',
    } as DriveFileData;

    const removeEventListenerSpy = vi.spyOn(abortController.signal, 'removeEventListener');

    const workerHandlerPromise = downloadWorkerHandler.handleWorkerMessages({
      worker: mockedWorker as unknown as Worker,
      itemData,
      abortController,
      updateProgressCallback: vi.fn(),
    });
    mockedWorker.emitMessage({
      result: 'error',
      error: 'error',
    });

    await expect(workerHandlerPromise).rejects.toBe('error');
    expect(removeEventListenerSpy).toHaveBeenCalledWith('abort', expect.any(Function));
    expect(mockedWorker.terminated).toBe(true);
  });
});
