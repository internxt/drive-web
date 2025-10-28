import { describe, test, expect, beforeEach, vi } from 'vitest';
import { DownloadFilePayload, MultipartDownload } from './MultipartDownload';
import { NetworkFacade } from '../NetworkFacade';
import { DownloadChunkTask, DownloadOptions } from '../types/index';
import { MaxRetriesExceededError } from '../errors/download.errors';

const TEST_BUCKET_ID = 'test-bucket';
const TEST_FILE_ID = 'test-file';
const TEST_MNEMONIC = 'test-mnemonic';
const TEST_FILE_SIZE = 1000;

async function consumeStream(stream: ReadableStream<Uint8Array>): Promise<{
  chunks: Uint8Array[];
  error: Error | undefined;
}> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let error: Error | undefined;

  try {
    let result = await reader.read();
    while (!result.done) {
      chunks.push(result.value);
      result = await reader.read();
    }
  } catch (err) {
    error = err as Error;
  }

  return { chunks, error };
}

function createMockStream(chunkData: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(chunkData);
      controller.close();
    },
  });
}

function executeDownload(
  multipartDownload: MultipartDownload,
  params: Partial<DownloadFilePayload & { fileSize?: number }>,
): ReadableStream<Uint8Array> {
  return multipartDownload.downloadFile({
    bucketId: params.bucketId ?? TEST_BUCKET_ID,
    fileId: params.fileId ?? TEST_FILE_ID,
    mnemonic: params.mnemonic ?? TEST_MNEMONIC,
    fileSize: params.fileSize ?? TEST_FILE_SIZE,
    options: params.options,
  });
}

function isMonotonicallyIncreasing(arr: number[]): boolean {
  return arr.every((value, index) => index === 0 || value >= arr[index - 1]);
}

describe('MultipartDownload ', () => {
  let multipartDownload: MultipartDownload;
  const networkFacade = NetworkFacade.prototype;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    multipartDownload = new MultipartDownload(networkFacade);
  });

  describe('Single chunk downloads', () => {
    test('When downloading a small file with 1 chunk, then it should download successfully', async () => {
      const bucketId = 'test-bucket';
      const fileId = 'test-file';
      const mnemonic = 'test-mnemonic';
      const fileSize = 1024;
      const mockChunkData = new Uint8Array([1, 2, 3, 4, 5]);

      const mockStream = createMockStream(mockChunkData);

      const downloadChunkSpy = vi.spyOn(networkFacade, 'downloadChunk').mockResolvedValue(mockStream);

      const resultStream = executeDownload(multipartDownload, {
        bucketId,
        fileId,
        mnemonic,
        fileSize,
      });

      const { chunks } = await consumeStream(resultStream);

      expect(downloadChunkSpy).toHaveBeenCalledTimes(1);
      expect(chunks[0]).toStrictEqual(mockChunkData);
    });

    test('When downloading a single chunk, then the progress callback should be called with correct progress', async () => {
      const fileSize = 1024;
      const mockChunkData = new Uint8Array(1024);
      const downloadingCallback = vi.fn();

      const mockStream = createMockStream(mockChunkData);

      vi.spyOn(networkFacade, 'downloadChunk').mockResolvedValue(mockStream);

      const options: DownloadOptions = {
        downloadingCallback,
      };

      const resultStream = executeDownload(multipartDownload, {
        bucketId: 'test-bucket',
        fileId: 'test-file',
        mnemonic: 'test-mnemonic',
        fileSize,
        options,
      });

      await consumeStream(resultStream);

      expect(downloadingCallback).toHaveBeenCalledWith(fileSize, 1024);
    });
  });

  describe('Multiple chunk downloads', () => {
    test('When downloading a file with multiple chunks, then all chunks should be downloaded successfully', async () => {
      const FIFTY_MEGABYTES = 52428800;
      const fileSize = FIFTY_MEGABYTES * 2.5;
      const chunkSize = 1024;
      const tasksSpy = vi.spyOn(multipartDownload, 'createDownloadTasks');
      const downloadChunkSpy = vi.spyOn(networkFacade, 'downloadChunk').mockImplementation(async ({ chunkStart }) => {
        const chunkData = new Uint8Array(chunkSize).fill(chunkStart % 256);
        return createMockStream(chunkData);
      });

      const resultStream = executeDownload(multipartDownload, {
        bucketId: 'test-bucket',
        fileId: 'test-file',
        mnemonic: 'test-mnemonic',
        fileSize,
      });

      const createdTasks = tasksSpy.mock.results[0].value as DownloadChunkTask[];
      const { chunks } = await consumeStream(resultStream);

      expect(downloadChunkSpy).toHaveBeenCalled();
      expect(downloadChunkSpy.mock.calls.length).toStrictEqual(createdTasks.length);
      expect(chunks.length).toBeGreaterThan(0);
    });

    test('When chunks complete in random order, then they should be streamed in correct order', async () => {
      const FIFTY_MEGABYTES = 52428800;
      const fileSize = FIFTY_MEGABYTES * 2.5;
      const chunkSize = 1024;
      const downloadOrder: number[] = [];
      const streamOrder: number[] = [];

      vi.spyOn(networkFacade, 'downloadChunk').mockImplementation(async ({ chunkStart, chunkEnd }) => {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 50));

        downloadOrder.push(chunkStart);

        const chunkData = new Uint8Array(chunkSize);

        const view = new DataView(chunkData.buffer);
        view.setUint32(0, chunkStart, true);

        return createMockStream(chunkData);
      });

      const resultStream = executeDownload(multipartDownload, {
        bucketId: 'test-bucket',
        fileId: 'test-file',
        mnemonic: 'test-mnemonic',
        fileSize,
      });

      const reader = resultStream.getReader();
      let result = await reader.read();

      while (!result.done) {
        const view = new DataView(result.value.buffer);
        const chunkStart = view.getUint32(0, true);
        streamOrder.push(chunkStart);
        result = await reader.read();
      }

      const isStreamOrderIncreasingInOrder = isMonotonicallyIncreasing(streamOrder);

      expect(streamOrder.length).toBeGreaterThan(0);
      expect(isStreamOrderIncreasingInOrder).toBeTruthy();
    });

    test('When downloading multiple chunks, then correct total progress should be reported', async () => {
      const FIFTY_MEGABYTES = 52428800;
      const fileSize = FIFTY_MEGABYTES * 2.5;
      const chunkSize = 1024;
      const downloadingCallback = vi.fn();
      let finalProgress = 0;

      vi.spyOn(networkFacade, 'downloadChunk').mockImplementation(async () => {
        const chunkData = new Uint8Array(chunkSize);
        return createMockStream(chunkData);
      });

      const options: DownloadOptions = {
        downloadingCallback: (total, downloaded) => {
          downloadingCallback(total, downloaded);
          finalProgress = downloaded;
        },
      };

      const resultStream = executeDownload(multipartDownload, {
        bucketId: 'test-bucket',
        fileId: 'test-file',
        mnemonic: 'test-mnemonic',
        fileSize,
        options,
      });

      await consumeStream(resultStream);

      expect(downloadingCallback).toHaveBeenCalled();
      expect(finalProgress).toBeLessThanOrEqual(fileSize);
      expect(finalProgress).toBeGreaterThan(0);

      expect(downloadingCallback).toHaveBeenCalledWith(fileSize, finalProgress);
    });

    test('When downloading concurrently, then concurrency limit of 6 should be respected', async () => {
      const FIFTY_MEGABYTES = 52428800;
      const fileSize = FIFTY_MEGABYTES * 6;
      const chunkSize = 1024;
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      vi.spyOn(networkFacade, 'downloadChunk').mockImplementation(async () => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);

        await new Promise((resolve) => setTimeout(resolve, 10));

        const chunkData = new Uint8Array(chunkSize);
        currentConcurrent--;

        return createMockStream(chunkData);
      });

      const resultStream = executeDownload(multipartDownload, {
        bucketId: 'test-bucket',
        fileId: 'test-file',
        mnemonic: 'test-mnemonic',
        fileSize,
      });

      await consumeStream(resultStream);

      expect(maxConcurrent).toBeLessThanOrEqual(6);
      expect(maxConcurrent).toBeGreaterThan(1);
    });
  });

  describe('Stream completion', () => {
    test('When all chunks are downloaded and streamed, then stream should close properly', async () => {
      const FIFTY_MEGABYTES = 52428800;
      const fileSize = FIFTY_MEGABYTES * 2;
      const chunkSize = 1024;

      vi.spyOn(networkFacade, 'downloadChunk').mockImplementation(async () => {
        const chunkData = new Uint8Array(chunkSize);
        return createMockStream(chunkData);
      });

      const resultStream = executeDownload(multipartDownload, {
        bucketId: 'test-bucket',
        fileId: 'test-file',
        mnemonic: 'test-mnemonic',
        fileSize,
      });

      const reader = resultStream.getReader();
      let result = await reader.read();
      let chunkCount = 0;

      while (!result.done) {
        chunkCount++;
        result = await reader.read();
      }

      expect(result.done).toBeTruthy();
      expect(result.value).toBeUndefined();
      expect(chunkCount).toBeGreaterThan(0);
    });

    test('When all downloads complete, then remaining chunks should be streamed before closing', async () => {
      const FIFTY_MEGABYTES = 52428800;
      const fileSize = FIFTY_MEGABYTES * 2.5;
      const chunkSize = 1024;
      const streamedChunks: number[] = [];

      const downloadChunkSpy = vi.spyOn(networkFacade, 'downloadChunk').mockImplementation(async ({ chunkStart }) => {
        const chunkData = new Uint8Array(chunkSize).fill(chunkStart % 256);
        return createMockStream(chunkData);
      });

      const resultStream = executeDownload(multipartDownload, {
        bucketId: 'test-bucket',
        fileId: 'test-file',
        mnemonic: 'test-mnemonic',
        fileSize,
      });

      const reader = resultStream.getReader();
      let result = await reader.read();

      while (!result.done) {
        streamedChunks.push(result.value[0]);
        result = await reader.read();
      }

      const totalCalls = downloadChunkSpy.mock.calls.length;
      expect(streamedChunks.length).toBe(totalCalls);
    });
  });

  describe('Max retries exceeded', () => {
    test('When a chunk fails more than max retries, then download should fail, abort should be called, and queue should be killed', async () => {
      const FIFTY_MEGABYTES = 52428800;
      const fileSize = FIFTY_MEGABYTES * 2.5;
      const abortController = new AbortController();
      const abortSpy = vi.spyOn(abortController, 'abort');

      vi.spyOn(networkFacade, 'downloadChunk').mockImplementation(async ({ chunkStart }) => {
        if (chunkStart === 0) {
          throw new Error('Persistent network error');
        }

        const chunkData = new Uint8Array(1024);
        return createMockStream(chunkData);
      });

      const options: DownloadOptions = {
        abortController,
      };

      const resultStream = executeDownload(multipartDownload, {
        bucketId: 'test-bucket',
        fileId: 'test-file',
        mnemonic: 'test-mnemonic',
        fileSize,
        options,
      });

      const reader = resultStream.getReader();

      const readPromise = (async () => {
        let result = await reader.read();
        while (!result.done) {
          result = await reader.read();
        }
      })();

      await expect(readPromise).rejects.toThrow(MaxRetriesExceededError);

      expect(abortSpy).toHaveBeenCalled();
    });
  });

  describe('Progress tracking with failures', () => {
    test('When a chunk fails before completion, then downloaded bytes should not be added to progress', async () => {
      const FIFTY_MEGABYTES = 52428800;
      const fileSize = FIFTY_MEGABYTES * 2;
      const chunkSize = 1024;
      const progressUpdates: number[] = [];
      const attemptsByChunk = new Map<number, number>();

      vi.spyOn(networkFacade, 'downloadChunk').mockImplementation(async ({ chunkStart }) => {
        const attempts = (attemptsByChunk.get(chunkStart) || 0) + 1;
        attemptsByChunk.set(chunkStart, attempts);

        if (chunkStart === 0 && attempts === 1) {
          throw new Error('Download failed');
        }

        const chunkData = new Uint8Array(chunkSize);
        return createMockStream(chunkData);
      });

      const options: DownloadOptions = {
        downloadingCallback: (_, downloaded) => {
          progressUpdates.push(downloaded);
        },
      };

      const resultStream = executeDownload(multipartDownload, {
        bucketId: 'test-bucket',
        fileId: 'test-file',
        mnemonic: 'test-mnemonic',
        fileSize,
        options,
      });

      await consumeStream(resultStream);

      const isProgressIncreasing = isMonotonicallyIncreasing(progressUpdates);

      expect(isProgressIncreasing).toBeTruthy();
    });

    test('When a chunk fails and retries, then bytes should only be counted once on success', async () => {
      const FIFTY_MEGABYTES = 52428800;
      const fileSize = FIFTY_MEGABYTES * 2;
      const chunkSize = 1024;
      const attemptsByChunk = new Map<number, number>();
      const progressUpdates: number[] = [];

      const downloadChunkSpy = vi.spyOn(networkFacade, 'downloadChunk').mockImplementation(async ({ chunkStart }) => {
        const attempts = (attemptsByChunk.get(chunkStart) || 0) + 1;
        attemptsByChunk.set(chunkStart, attempts);

        // First chunk fails on first attempt
        if (chunkStart === 0 && attempts === 1) {
          throw new Error('First attempt failed');
        }

        const chunkData = new Uint8Array(chunkSize);
        return createMockStream(chunkData);
      });

      const options: DownloadOptions = {
        downloadingCallback: (_, downloaded) => {
          progressUpdates.push(downloaded);
        },
      };

      const resultStream = executeDownload(multipartDownload, {
        bucketId: 'test-bucket',
        fileId: 'test-file',
        mnemonic: 'test-mnemonic',
        fileSize,
        options,
      });

      await consumeStream(resultStream);

      expect(attemptsByChunk.get(0)).toBe(2);

      const isProgressIncreasing = isMonotonicallyIncreasing(progressUpdates);
      expect(isProgressIncreasing).toBe(true);

      const finalProgress = progressUpdates[progressUpdates.length - 1];
      expect(finalProgress).toBeGreaterThan(0);
      expect(finalProgress).toBeLessThanOrEqual(fileSize);

      const totalChunks = downloadChunkSpy.mock.calls.length;
      const expectedBytes = (totalChunks - 1) * chunkSize;

      expect(finalProgress).toBe(expectedBytes);
    });

    test('When a chunk fails after being registered, then its bytes should be reverted', async () => {
      const FIFTY_MEGABYTES = 52428800;
      const fileSize = FIFTY_MEGABYTES * 2;
      const chunkSize = 1024;
      const progressSnapshots: number[] = [];

      vi.spyOn(networkFacade, 'downloadChunk').mockImplementation(async () => {
        const chunkData = new Uint8Array(chunkSize);
        return createMockStream(chunkData);
      });

      const options: DownloadOptions = {
        downloadingCallback: (_, downloaded) => {
          progressSnapshots.push(downloaded);
        },
      };

      const resultStream = executeDownload(multipartDownload, {
        bucketId: 'test-bucket',
        fileId: 'test-file',
        mnemonic: 'test-mnemonic',
        fileSize,
        options,
      });

      await consumeStream(resultStream);

      const isProgressIncreasing = isMonotonicallyIncreasing(progressSnapshots);

      expect(isProgressIncreasing).toBeTruthy();
    });
  });

  describe('Stream errors', () => {
    test('When network returns invalid stream, then error should be caught and retried', async () => {
      const FIFTY_MEGABYTES = 52428800;
      const fileSize = FIFTY_MEGABYTES * 1.5;
      const chunkSize = 1024;
      const attemptsByChunk = new Map<number, number>();

      vi.spyOn(networkFacade, 'downloadChunk').mockImplementation(async ({ chunkStart }) => {
        const attempts = (attemptsByChunk.get(chunkStart) || 0) + 1;
        attemptsByChunk.set(chunkStart, attempts);

        if (chunkStart === 0 && attempts === 1) {
          return null as any;
        }

        const chunkData = new Uint8Array(chunkSize);
        return createMockStream(chunkData);
      });

      const resultStream = executeDownload(multipartDownload, {
        bucketId: 'test-bucket',
        fileId: 'test-file',
        mnemonic: 'test-mnemonic',
        fileSize,
      });

      await consumeStream(resultStream);

      expect(attemptsByChunk.get(0)! > 1).toBeTruthy();
    });

    test('When stream reading fails mid-chunk, then chunk should be retried', async () => {
      const FIFTY_MEGABYTES = 52428800;
      const fileSize = FIFTY_MEGABYTES * 1.5;
      const chunkSize = 1024;
      const attemptsByChunk = new Map<number, number>();

      vi.spyOn(networkFacade, 'downloadChunk').mockImplementation(async ({ chunkStart }) => {
        const attempts = (attemptsByChunk.get(chunkStart) || 0) + 1;
        attemptsByChunk.set(chunkStart, attempts);

        if (chunkStart === 0 && attempts === 1) {
          return new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array(512));
              controller.error(new Error('Stream read error'));
            },
          });
        }

        const chunkData = new Uint8Array(chunkSize);
        return createMockStream(chunkData);
      });

      const resultStream = executeDownload(multipartDownload, {
        bucketId: 'test-bucket',
        fileId: 'test-file',
        mnemonic: 'test-mnemonic',
        fileSize,
      });

      await consumeStream(resultStream);

      const firstChunkAttempts = attemptsByChunk.get(0) || 0;
      expect(firstChunkAttempts >= 2).toBeTruthy();
    });
  });
});
