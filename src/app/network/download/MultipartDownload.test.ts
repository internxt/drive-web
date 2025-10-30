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
  params?: Partial<DownloadFilePayload & { fileSize?: number }>,
): ReadableStream<Uint8Array> {
  return multipartDownload.downloadFile({
    bucketId: params?.bucketId ?? TEST_BUCKET_ID,
    fileId: params?.fileId ?? TEST_FILE_ID,
    mnemonic: params?.mnemonic ?? TEST_MNEMONIC,
    fileSize: params?.fileSize ?? TEST_FILE_SIZE,
    options: params?.options,
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
      const mockChunkData = new Uint8Array([1, 2, 3, 4, 5]);
      const mockStream = createMockStream(mockChunkData);
      const downloadChunkSpy = vi.spyOn(networkFacade, 'downloadChunk').mockResolvedValue(mockStream);

      const resultStream = executeDownload(multipartDownload);
      const { chunks } = await consumeStream(resultStream);

      expect(downloadChunkSpy).toHaveBeenCalledOnce();
      expect(chunks).toHaveLength(1);
      expect(chunks[0]).toStrictEqual(mockChunkData);
    });

    test('When downloading a single chunk, then the progress callback should be called with correct progress', async () => {
      const chunkSize = 1024;
      const fileSize = chunkSize;
      const mockChunkData = new Uint8Array(chunkSize);
      const downloadingCallback = vi.fn();

      const mockStream = createMockStream(mockChunkData);

      vi.spyOn(networkFacade, 'downloadChunk').mockResolvedValue(mockStream);

      const options: DownloadOptions = {
        downloadingCallback,
      };

      const resultStream = executeDownload(multipartDownload, {
        fileSize,
        options,
      });

      await consumeStream(resultStream);

      expect(downloadingCallback).toHaveBeenCalledWith(fileSize, chunkSize);
      expect(downloadingCallback).toHaveBeenCalledOnce();
    });
  });

  describe('Multiple chunk downloads', () => {
    test('When downloading a file with multiple chunks, then all chunks should be downloaded successfully', async () => {
      const chunkSize = 1024;
      const fileSize = 200 * chunkSize * chunkSize;
      const tasksSpy = vi.spyOn(multipartDownload, 'createDownloadTasks');
      const downloadChunkSpy = vi.spyOn(networkFacade, 'downloadChunk').mockImplementation(async ({ chunkStart }) => {
        const chunkData = new Uint8Array(chunkSize).fill(chunkStart);
        return createMockStream(chunkData);
      });

      const resultStream = executeDownload(multipartDownload, {
        fileSize,
      });

      const createdTasks = tasksSpy.mock.results[0].value as DownloadChunkTask[];
      const { chunks } = await consumeStream(resultStream);

      expect(downloadChunkSpy.mock.calls.length).toStrictEqual(createdTasks.length);
      expect(chunks.length).toStrictEqual(createdTasks.length);
    });

    test('When chunks complete in a unordered way, then they should be streamed in the correct order', async () => {
      const chunkSize = 1024;
      const fileSize = chunkSize * 3;

      const createTasksSpy = vi.spyOn(multipartDownload, 'createDownloadTasks').mockReturnValue([
        { index: 2, chunkStart: 2048, chunkEnd: 3071, attempt: 0, maxRetries: 3 },
        { index: 0, chunkStart: 0, chunkEnd: 1023, attempt: 0, maxRetries: 3 },
        { index: 1, chunkStart: 1024, chunkEnd: 2047, attempt: 0, maxRetries: 3 },
      ]);
      vi.spyOn(networkFacade, 'downloadChunk').mockImplementation(async ({ chunkStart }) => {
        const data = new Uint8Array(chunkSize);
        new DataView(data.buffer).setUint32(0, chunkStart, true);
        return createMockStream(data);
      });

      const stream = executeDownload(multipartDownload, {
        fileSize,
      });

      const { chunks } = await consumeStream(stream);
      const order = chunks.map((c) => new DataView(c.buffer).getUint32(0, true));
      expect(order).toEqual([0, chunkSize, chunkSize * 2]);

      createTasksSpy.mockRestore();
    });

    test('When downloading multiple chunks, then correct total progress should be reported', async () => {
      const chunkSize = 1024;
      const fileSize = 200 * chunkSize * chunkSize;
      const downloadingCallback = vi.fn();
      let finalProgress = 0;

      const downloadChunk = vi.spyOn(networkFacade, 'downloadChunk').mockImplementation(async () => {
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
        fileSize,
        options,
      });

      await consumeStream(resultStream);

      const totalChunksDownloaded = downloadChunk.mock.calls.length;
      // N chunks downloaded * chunk size = total progress
      const expectedFinalProgress = totalChunksDownloaded * chunkSize;

      expect(finalProgress).toBe(expectedFinalProgress);
      expect(downloadingCallback).toHaveBeenCalledTimes(totalChunksDownloaded);
      expect(downloadingCallback).toHaveBeenLastCalledWith(fileSize, expectedFinalProgress);
    });

    test('When downloading concurrently, then concurrency limit should match tasks when tasks < limit', async () => {
      const chunkSize = 1024;
      const fileSize = 150 * chunkSize * chunkSize;
      let currentConcurrent = 0;

      const createTasksSpy = vi.spyOn(multipartDownload, 'createDownloadTasks');

      vi.spyOn(networkFacade, 'downloadChunk').mockImplementation(async () => {
        currentConcurrent++;

        await new Promise((resolve) => setTimeout(resolve, 10));

        const chunkData = new Uint8Array(chunkSize);

        return createMockStream(chunkData);
      });

      const resultStream = executeDownload(multipartDownload, {
        fileSize,
      });

      await consumeStream(resultStream);

      const totalTasks = createTasksSpy.mock.results[0].value.length;

      expect(currentConcurrent).toBe(totalTasks);
    });
  });

  describe('Stream completion', () => {
    test('When all chunks are downloaded and streamed, then stream should close properly', async () => {
      const chunkSize = 1024;
      const fileSize = chunkSize * chunkSize * 200;

      const createTasksSpy = vi.spyOn(multipartDownload, 'createDownloadTasks');
      vi.spyOn(networkFacade, 'downloadChunk').mockImplementation(async () => {
        const chunkData = new Uint8Array(chunkSize);
        return createMockStream(chunkData);
      });

      const resultStream = executeDownload(multipartDownload, {
        fileSize,
      });

      const createdTasks = createTasksSpy.mock.results[0].value;
      const expectedChunkCount = createdTasks.length;
      const reader = resultStream.getReader();
      let result = await reader.read();
      let chunkCount = 0;

      while (!result.done) {
        chunkCount++;
        result = await reader.read();
      }

      expect(result.done).toBeTruthy();
      expect(result.value).toBeUndefined();
      expect(chunkCount).toStrictEqual(expectedChunkCount);
    });

    test('When all downloads complete, then remaining chunks should be streamed before closing', async () => {
      const chunkSize = 1024;
      const fileSize = chunkSize * chunkSize * 250;
      const streamedChunks: number[] = [];

      const downloadChunkSpy = vi.spyOn(networkFacade, 'downloadChunk').mockImplementation(async ({ chunkStart }) => {
        const chunkData = new Uint8Array(chunkSize).fill(chunkStart % 256);
        return createMockStream(chunkData);
      });

      const resultStream = executeDownload(multipartDownload, {
        fileSize,
      });

      const reader = resultStream.getReader();
      let result = await reader.read();

      while (!result.done) {
        streamedChunks.push(result.value[0]);
        result = await reader.read();
      }

      const totalCalls = downloadChunkSpy.mock.calls.length;
      expect(streamedChunks.length).toStrictEqual(totalCalls);
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
        fileSize,
        options,
      });

      const { error } = await consumeStream(resultStream);

      expect(error).toBeInstanceOf(MaxRetriesExceededError);
      expect(abortSpy).toHaveBeenCalledOnce();
    });
  });

  describe('Progress tracking with failures', () => {
    test('When a chunk fails before completion, then downloaded bytes should not be added to progress', async () => {
      const chunkSize = 1024;
      const fileSize = chunkSize * chunkSize * 200;
      const progressUpdates: number[] = [];
      const attemptsByChunk = new Map<number, number>();

      const createTasksSpy = vi.spyOn(multipartDownload, 'createDownloadTasks');
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

      const resultStream = executeDownload(multipartDownload, { fileSize, options });
      await consumeStream(resultStream);

      const totalTasks = createTasksSpy.mock.results[0].value.length;
      const expectedFinalProgress = totalTasks * chunkSize;
      const finalProgress = progressUpdates[progressUpdates.length - 1];

      expect(attemptsByChunk.get(0)).toBe(2);
      expect(finalProgress).toStrictEqual(expectedFinalProgress);
    });
  });

  describe('Stream errors', () => {
    test('When network returns invalid stream, then error should be caught and retried', async () => {
      const chunkSize = 1024;
      const fileSize = chunkSize * chunkSize * 150;
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
        fileSize,
      });

      await consumeStream(resultStream);

      expect(attemptsByChunk.get(0)! >= 2).toBeTruthy();
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
        fileSize,
      });

      await consumeStream(resultStream);

      const firstChunkAttempts = attemptsByChunk.get(0) || 0;
      expect(firstChunkAttempts >= 2).toBeTruthy();
    });
  });
});
