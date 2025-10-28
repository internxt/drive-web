vi.mock('../download.service/downloadFileFromBlob', () => ({
  default: vi.fn(),
}));

import streamSaver from 'streamsaver';
import { describe, test, expect, vi, Mock, beforeEach } from 'vitest';
import { downloadWorkerHandler } from './downloadWorkerHandler';
import { DriveFileData } from 'app/drive/types';
import { MockWorker } from '../../../../__mocks__/WebWorker';
import downloadFileFromBlob from '../download.service/downloadFileFromBlob';
import { DownloadAbortedByUserError } from 'app/network/errors/download.errors';

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

  describe('Concurrent downloads', () => {
    const mockedWorker1 = new MockWorker();
    const mockedWorker2 = new MockWorker();
    const mockedChunks = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])];

    const itemData1 = {
      fileId: 'file-1',
      plainName: 'document-1',
      type: 'pdf',
    } as DriveFileData;

    const itemData2 = {
      fileId: 'file-2',
      plainName: 'document-2',
      type: 'pdf',
    } as DriveFileData;

    const write1Mock = vi.fn();
    const close1Mock = vi.fn();
    const write2Mock = vi.fn();
    const close2Mock = vi.fn();
    const abort1Mock = vi.fn();
    const abort2Mock = vi.fn();

    const mockWriter1 = {
      write: write1Mock,
      close: close1Mock,
      abort: abort1Mock,
    };

    const mockWriter2 = {
      write: write2Mock,
      close: close2Mock,
      abort: abort2Mock,
    };

    test('When downloading multiple files concurrently, then each file should have its own writer', async () => {
      vi.mocked(streamSaver.createWriteStream)
        .mockReturnValueOnce({
          getWriter: vi.fn().mockReturnValue(mockWriter1),
        } as unknown as WritableStream)
        .mockReturnValueOnce({
          getWriter: vi.fn().mockReturnValue(mockWriter2),
        } as unknown as WritableStream);

      const promise1 = downloadWorkerHandler.handleWorkerMessages({
        worker: mockedWorker1 as unknown as Worker,
        itemData: itemData1,
        updateProgressCallback: vi.fn(),
      });
      const promise2 = downloadWorkerHandler.handleWorkerMessages({
        worker: mockedWorker2 as unknown as Worker,
        itemData: itemData2,
        updateProgressCallback: vi.fn(),
      });

      mockedWorker1.emitMessage({
        result: 'chunk',
        chunk: mockedChunks[0],
      });
      mockedWorker2.emitMessage({
        result: 'chunk',
        chunk: mockedChunks[1],
      });
      mockedWorker1.emitMessage({
        result: 'success',
        fileId: itemData1.fileId,
      });
      mockedWorker2.emitMessage({
        result: 'success',
        fileId: itemData2.fileId,
      });

      await expect(promise1).resolves.toBe(itemData1.fileId);
      await expect(promise2).resolves.toBe(itemData2.fileId);
      expect(write1Mock).toHaveBeenCalledWith(mockedChunks[0]);
      expect(write2Mock).toHaveBeenCalledWith(mockedChunks[1]);
      expect(close1Mock).toHaveBeenCalled();
      expect(close2Mock).toHaveBeenCalled();
      expect(mockedWorker1.terminated).toBeTruthy();
      expect(mockedWorker2.terminated).toBeTruthy();
    });

    test('When one download fails, then it should not affect other concurrent downloads', async () => {
      const mockedError = new Error('Download failed');
      vi.mocked(streamSaver.createWriteStream)
        .mockReturnValueOnce({
          getWriter: vi.fn().mockReturnValue(mockWriter1),
        } as unknown as WritableStream)
        .mockReturnValueOnce({
          getWriter: vi.fn().mockReturnValue(mockWriter2),
        } as unknown as WritableStream);

      const promise1 = downloadWorkerHandler.handleWorkerMessages({
        worker: mockedWorker1 as unknown as Worker,
        itemData: itemData1,
        updateProgressCallback: vi.fn(),
      });

      const promise2 = downloadWorkerHandler.handleWorkerMessages({
        worker: mockedWorker2 as unknown as Worker,
        itemData: itemData2,
        updateProgressCallback: vi.fn(),
      });

      mockedWorker1.emitMessage({
        result: 'chunk',
        chunk: mockedChunks[0],
      });

      mockedWorker2.emitMessage({
        result: 'chunk',
        chunk: mockedChunks[1],
      });

      mockedWorker1.emitMessage({
        result: 'error',
        error: mockedError.message,
      });
      mockedWorker2.emitMessage({
        result: 'success',
        fileId: itemData2.fileId,
      });

      await expect(promise1).rejects.toThrow(mockedError);
      await expect(promise2).resolves.toBe(itemData2.fileId);
      expect(abort1Mock).toHaveBeenCalled();
      expect(write2Mock).toHaveBeenCalledWith(mockedChunks[1]);
      expect(mockedWorker2.terminated).toBeTruthy();
      expect(close2Mock).toHaveBeenCalled();
    });

    test('When aborting one download, then it should not affect other concurrent downloads', async () => {
      const abortController1 = new AbortController();

      vi.mocked(streamSaver.createWriteStream)
        .mockReturnValueOnce({
          getWriter: vi.fn().mockReturnValue(mockWriter1),
        } as unknown as WritableStream)
        .mockReturnValueOnce({
          getWriter: vi.fn().mockReturnValue(mockWriter2),
        } as unknown as WritableStream);

      const promise1 = downloadWorkerHandler.handleWorkerMessages({
        worker: mockedWorker1 as unknown as Worker,
        itemData: itemData1,
        abortController: abortController1,
        updateProgressCallback: vi.fn(),
      });

      const promise2 = downloadWorkerHandler.handleWorkerMessages({
        worker: mockedWorker2 as unknown as Worker,
        itemData: itemData2,
        updateProgressCallback: vi.fn(),
      });

      mockedWorker1.emitMessage({
        result: 'chunk',
        chunk: new Uint8Array([1, 2, 3]),
      });

      mockedWorker2.emitMessage({
        result: 'chunk',
        chunk: new Uint8Array([4, 5, 6]),
      });

      abortController1.abort();

      mockedWorker1.emitMessage({
        result: 'abort',
      });
      mockedWorker2.emitMessage({
        result: 'success',
        fileId: itemData2.fileId,
      });

      await expect(promise1).rejects.toThrow(DownloadAbortedByUserError);
      await expect(promise2).resolves.toBe(itemData2.fileId);
      expect(abortController1.signal.aborted).toBeTruthy();
      expect(abort1Mock).toHaveBeenCalled();
      expect(write2Mock).toHaveBeenCalledWith(mockedChunks[1]);
      expect(close2Mock).toHaveBeenCalled();
    });
  });

  describe('Cleaning up the worker', () => {
    test('When cleanup is called and should abort, then writer should be aborted', async () => {
      const mockedWorker = new MockWorker();
      const downloadId = 'test-download-id';
      const mockAbort = vi.fn();
      const mockWriter = {
        write: vi.fn(),
        abort: mockAbort,
        close: vi.fn(),
      };

      downloadWorkerHandler['writers'].set(downloadId, mockWriter as any);

      await downloadWorkerHandler.downloadCleanup(mockedWorker as unknown as Worker, downloadId, true);

      expect(mockAbort).toHaveBeenCalled();
      expect(downloadWorkerHandler['writers'].has(downloadId)).toBe(false);
      expect(mockedWorker.terminated).toBeTruthy();
    });

    test('When cleanup is called without abort, then writer should be closed', async () => {
      const mockedWorker = new MockWorker();
      const downloadId = 'test-download-id';
      const mockClose = vi.fn();
      const mockWriter = {
        write: vi.fn(),
        abort: vi.fn(),
        close: mockClose,
      };

      downloadWorkerHandler['writers'].set(downloadId, mockWriter as any);

      await downloadWorkerHandler.downloadCleanup(mockedWorker as unknown as Worker, downloadId, false);

      expect(mockClose).toHaveBeenCalled();
      expect(downloadWorkerHandler['writers'].has(downloadId)).toBe(false);
      expect(mockedWorker.terminated).toBeTruthy();
    });

    test('When cleanup is called a remove abort listener function, then it should be invoked', async () => {
      const mockedWorker = new MockWorker();
      const downloadId = 'test-download-id';
      const removeAbortListener = vi.fn();

      await downloadWorkerHandler.downloadCleanup(
        mockedWorker as unknown as Worker,
        downloadId,
        false,
        removeAbortListener,
      );

      expect(removeAbortListener).toHaveBeenCalled();
      expect(mockedWorker.terminated).toBeTruthy();
    });
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
      expect(mockedWorker.terminated).toBeTruthy();
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
      expect(mockedWorker.terminated).toBeTruthy();
    });

    test('When abort message is received from worker, then it should be handled gracefully', async () => {
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

      abortController.abort();

      mockedWorker.emitMessage({
        result: 'abort',
      });

      await expect(workerHandlerPromise).rejects.toThrow(new DownloadAbortedByUserError());
      expect(mockedWorker.terminated).toBeTruthy();
    });

    test('When messages arrive after abort, then they should be ignored', async () => {
      const mockedWorker = new MockWorker();
      const itemData = {
        fileId: 'random-id',
      } as DriveFileData;
      const abortController = new AbortController();
      const consoleLogSpy = vi.spyOn(console, 'log');

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
        result: 'progress',
        progress: 0.5,
      });

      mockedWorker.emitMessage({
        result: 'chunk',
        chunk: new Uint8Array([4, 5, 6]),
      });

      await expect(workerHandlerPromise).rejects.toThrow(new DownloadAbortedByUserError());
      expect(consoleLogSpy).toHaveBeenCalledWith('[MAIN_THREAD]: Ignoring message after abort:', 'progress');
      expect(consoleLogSpy).toHaveBeenCalledWith('[MAIN_THREAD]: Ignoring message after abort:', 'chunk');
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
    expect(mockedWorker.terminated).toBeTruthy();
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
    expect(mockedWorker.terminated).toBeTruthy();
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
    expect(mockedWorker.terminated).toBeTruthy();
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
    expect(mockedWorker.terminated).toBeTruthy();
  });

  test('When the event is an error and there is a writer, then it should abort the writer before terminating', async () => {
    const mockedWorker = new MockWorker();
    const mockedError = new Error('download failed');
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
      error: mockedError.message,
    });

    await expect(workerHandlerPromise).rejects.toThrow(mockedError);
    expect(mockAbort).toHaveBeenCalled();
    expect(mockedWorker.terminated).toBeTruthy();
  });
});
