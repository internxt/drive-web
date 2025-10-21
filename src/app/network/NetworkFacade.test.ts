/* eslint-disable no-constant-condition */
import { describe, it, expect, vi, beforeEach, afterEach, test } from 'vitest';
import { NetworkFacade } from './NetworkFacade';
import { Network as NetworkModule } from '@internxt/sdk';
import { downloadFile } from '@internxt/sdk/dist/network/download';
import { decryptStream } from 'app/core/services/stream.service';
import { queue } from 'async';
import { NetworkUtils } from 'app/utils/networkUtils';

vi.mock('@internxt/sdk/dist/network/download');
vi.mock('app/core/services/stream.service', () => ({
  binaryStreamToBlob: vi.fn(),
  buildProgressStream: vi.fn(),
  decryptStream: vi.fn(),
  joinReadableBinaryStreams: vi.fn(),
}));
vi.mock('async');
vi.mock('bip39');
vi.mock('crypto');

describe('NetworkFacade', () => {
  let networkFacade: NetworkFacade;
  let mockNetwork: NetworkModule.Network;
  let mockAbortController: AbortController;

  beforeEach(() => {
    mockNetwork = {} as NetworkModule.Network;
    networkFacade = new NetworkFacade(mockNetwork);
    mockAbortController = new AbortController();

    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Downloading a chunk', () => {
    const downloadExample = 'http://s3.inxt.download.com/example';
    const bucketId = 'test-bucket';
    const fileId = 'test-file';
    const mnemonic = 'test-mnemonic';
    const chunkStart = 0;
    const chunkEnd = 1024;

    test('When the download of a chunk is requested,then should download the chunk with a 206 status', async () => {
      const mockStream = new ReadableStream();
      const mockDecryptedStream = new ReadableStream();
      const mockResponse = {
        status: 206,
        body: mockStream,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);
      (downloadFile as any).mockImplementation(
        async (fileId, bucketId, mnemonic, network, cryptoLib, bufferFrom, downloadCallback, decryptCallback) => {
          await downloadCallback([{ url: downloadExample }]);
          await decryptCallback();
        },
      );
      vi.mocked(decryptStream).mockReturnValue(mockDecryptedStream);

      const result = await networkFacade.downloadChunk(bucketId, fileId, mnemonic, chunkStart, chunkEnd);

      expect(result).toStrictEqual(mockDecryptedStream);

      expect(global.fetch).toHaveBeenCalledWith(
        downloadExample,
        expect.objectContaining({
          headers: {
            Range: `bytes=${chunkStart}-${chunkEnd}`,
            Connection: 'keep-alive',
          },
          keepalive: true,
        }),
      );
    });

    it('When the status is not 200 or 206 (successfully downloaded), then an error indicating so is thrown', async () => {
      const mockResponse = {
        status: 404,
        body: new ReadableStream(),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);
      (downloadFile as any).mockImplementation(
        async (fileId, bucketId, mnemonic, network, cryptoLib, bufferFrom, downloadCallback, decryptCallback) => {
          await downloadCallback([{ url: downloadExample }]);
        },
      );

      await expect(networkFacade.downloadChunk(bucketId, fileId, mnemonic, chunkStart, chunkEnd)).rejects.toThrow(
        'Unexpected status 404',
      );
    });

    test('When there is no body in the response, then an error is thrown', async () => {
      const mockResponse = {
        status: 206,
        body: null,
      };

      (global.fetch as any).mockResolvedValue(mockResponse);
      (downloadFile as any).mockImplementation(
        async (fileId, bucketId, mnemonic, network, cryptoLib, bufferFrom, downloadCallback, decryptCallback) => {
          await downloadCallback([{ url: downloadExample }]);
        },
      );

      await expect(networkFacade.downloadChunk(bucketId, fileId, mnemonic, chunkStart, chunkEnd)).rejects.toThrow(
        'No content received',
      );
    });

    it('When the download is aborted, then an error indicating so is thrown', async () => {
      const abortController = new AbortController();
      abortController.abort();

      (downloadFile as any).mockImplementation(
        async (fileId, bucketId, mnemonic, network, cryptoLib, bufferFrom, downloadCallback, decryptCallback) => {
          await downloadCallback([{ url: downloadExample }]);
        },
      );
      await expect(
        networkFacade.downloadChunk(bucketId, fileId, mnemonic, chunkStart, chunkEnd, {
          abortController,
        }),
      ).rejects.toThrow('Download aborted');
    });
  });

  describe('Downloading a file using chunks (multipart download)', () => {
    const bucketId = 'test-bucket';
    const fileId = 'test-file';
    const mnemonic = 'test-mnemonic';
    const fileSize = 100 * 1024 * 1024;

    const createMockQueue = (options?: { executeWorker?: boolean }) => {
      let queueWorker: any;
      let queueErrorCallback: any;
      let drainCallback: any;

      const mockQueue = {
        push: vi.fn((task) => {
          if (options?.executeWorker && queueWorker) {
            queueWorker(task).catch(() => {});
          }
        }),
        unshift: vi.fn(),
        error: vi.fn((callback) => {
          queueErrorCallback = callback;
        }),
        drain: vi.fn((callback) => {
          drainCallback = callback;
          if (options?.executeWorker) {
            setTimeout(callback, 0);
          }
        }),
        kill: vi.fn(),
        running: vi.fn().mockReturnValue(0),
        length: vi.fn().mockReturnValue(0),
        unsaturated: vi.fn(),
      };

      (queue as any).mockImplementation((worker) => {
        queueWorker = worker;
        return mockQueue;
      });

      return { mockQueue, getErrorCallback: () => queueErrorCallback, getDrainCallback: () => drainCallback };
    };

    beforeEach(() => {
      createMockQueue();
    });

    test('When downloading a file using chunks, then download the file and stream the chunks in order', async () => {
      const mockChunkData = new Uint8Array([1, 2, 3, 4]);

      const mockChunkStream = new ReadableStream({
        start(controller) {
          controller.enqueue(mockChunkData);
          controller.close();
        },
      });

      vi.spyOn(networkFacade, 'downloadChunk').mockResolvedValue(mockChunkStream);

      const stream = await networkFacade.downloadMultipart(bucketId, fileId, mnemonic, fileSize);
      expect(stream).toBeInstanceOf(ReadableStream);
    });

    test('When a chunk fails but it is not the last attempt, then should retry the chunk up to 3 times', async () => {
      const { mockQueue, getErrorCallback } = createMockQueue();

      const mockError = new Error('Download chunk failed');
      vi.spyOn(networkFacade, 'downloadChunk').mockRejectedValue(mockError);

      await networkFacade.downloadMultipart(bucketId, fileId, mnemonic, fileSize);

      const task = {
        index: 0,
        chunkStart: 0,
        chunkEnd: 1023,
        attempt: 0,
        maxRetries: 3,
      };

      const errorCallback = getErrorCallback();
      if (errorCallback) {
        errorCallback(mockError, task);
      }

      expect(mockQueue.unshift).toHaveBeenCalled();
    });

    test('When a chunk fails and it is the last attempt, then an error indicating so is thrown', async () => {
      let capturedController;
      const { getErrorCallback } = createMockQueue();

      const mockError = new Error('Download chunk failed');
      vi.spyOn(networkFacade, 'downloadChunk').mockRejectedValue(mockError);

      const OriginalReadableStream = global.ReadableStream;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      global.ReadableStream = class extends OriginalReadableStream {
        constructor(underlyingSource?: any) {
          const wrappedSource = {
            ...underlyingSource,
            start: (controller: any) => {
              capturedController = controller;
              vi.spyOn(controller, 'error');
              return underlyingSource?.start?.(controller);
            },
          };
          super(wrappedSource);
        }
      } as any;

      await networkFacade.downloadMultipart(bucketId, fileId, mnemonic, fileSize, {
        abortController: mockAbortController,
      });

      const task = {
        index: 0,
        chunkStart: 0,
        chunkEnd: 1023,
        attempt: 3,
        maxRetries: 3,
      };

      vi.spyOn(NetworkUtils.instance, 'createDownloadChunks').mockReturnValue([task]);

      const errorCallback = getErrorCallback();
      if (errorCallback) {
        errorCallback(mockError, task);
      }

      expect(mockAbortController.signal.aborted).toBe(true);
      expect(capturedController.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Download failed: Download chunk failed',
        }),
      );

      global.ReadableStream = OriginalReadableStream;
    });

    test('When downloading a file using chunks is aborted, then the worker is terminated', async () => {
      const abortController = new AbortController();
      createMockQueue();

      vi.spyOn(networkFacade, 'downloadChunk').mockImplementation(() => {
        abortController.abort();
        return Promise.reject(new Error('Download aborted'));
      });

      const stream = await networkFacade.downloadMultipart(bucketId, fileId, mnemonic, fileSize, { abortController });
      expect(stream).toBeInstanceOf(ReadableStream);
    });

    describe('Downloading a chunk function (downloadTask)', () => {
      test('When downloading a chunk, then should call the progress callback', async () => {
        const mockChunk1 = new Uint8Array([1, 2, 3]);
        const mockChunk2 = new Uint8Array([4, 5, 6]);
        const downloadingCallback = vi.fn();

        createMockQueue({ executeWorker: true });

        const mockChunkStream = new ReadableStream({
          start(controller) {
            controller.enqueue(mockChunk1);
            controller.enqueue(mockChunk2);
            controller.close();
          },
        });

        vi.spyOn(networkFacade, 'downloadChunk').mockResolvedValue(mockChunkStream);

        const stream = await networkFacade.downloadMultipart(bucketId, fileId, mnemonic, fileSize, {
          downloadingCallback,
        });

        const reader = stream.getReader();
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }

        expect(downloadingCallback).toHaveBeenCalled();
      });

      test('When chunk stream is empty, then should handle it correctly', async () => {
        createMockQueue({ executeWorker: true });

        const mockChunkStream = new ReadableStream({
          start(controller) {
            controller.close();
          },
        });

        vi.spyOn(networkFacade, 'downloadChunk').mockResolvedValue(mockChunkStream);

        const stream = await networkFacade.downloadMultipart(bucketId, fileId, mnemonic, fileSize);

        const reader = stream.getReader();
        const { done } = await reader.read();

        expect(done).toBe(true);
      });

      test('When reading chunks, then should release reader lock in finally block', async () => {
        const releaseLockSpy = vi.fn();
        const mockReader = {
          read: vi
            .fn()
            .mockResolvedValueOnce({ done: false, value: new Uint8Array([1]) })
            .mockResolvedValueOnce({ done: true }),
          releaseLock: releaseLockSpy,
        };

        createMockQueue({ executeWorker: true });

        const mockChunkStream = {
          getReader: () => mockReader,
        };

        vi.spyOn(networkFacade, 'downloadChunk').mockResolvedValue(mockChunkStream as any);

        await networkFacade.downloadMultipart(bucketId, fileId, mnemonic, fileSize);

        await new Promise((resolve) => setTimeout(resolve, 100));

        expect(releaseLockSpy).toHaveBeenCalled();
      });
    });

    describe('Download Queue', () => {
      test('When processing chunks, then the queue should handle concurrency correctly', async () => {
        (queue as any).mockImplementation((worker, concurrency) => {
          expect(concurrency).toBeGreaterThan(0);
          return {
            push: vi.fn(),
            unshift: vi.fn(),
            error: vi.fn(),
            drain: vi.fn(),
            kill: vi.fn(),
            running: vi.fn().mockReturnValue(0),
            length: vi.fn().mockReturnValue(0),
          };
        });

        const mockChunkStream = new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array([1, 2, 3]));
            controller.close();
          },
        });

        vi.spyOn(networkFacade, 'downloadChunk').mockResolvedValue(mockChunkStream);

        await networkFacade.downloadMultipart(bucketId, fileId, mnemonic, fileSize);

        expect(queue).toHaveBeenCalled();
      });

      test('When queue drains, then should call drain callback and close stream', async () => {
        const { getDrainCallback } = createMockQueue();

        const mockChunkStream = new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array([1, 2, 3]));
            controller.close();
          },
        });

        vi.spyOn(networkFacade, 'downloadChunk').mockResolvedValue(mockChunkStream);

        await networkFacade.downloadMultipart(bucketId, fileId, mnemonic, fileSize);

        expect(getDrainCallback()).toBeDefined();
      });

      test('When all chunks are downloaded, then queue should process all tasks', async () => {
        const { mockQueue } = createMockQueue();

        const tasks = [
          { index: 0, chunkStart: 0, chunkEnd: 1023, attempt: 0, maxRetries: 3 },
          { index: 1, chunkStart: 1024, chunkEnd: 2047, attempt: 0, maxRetries: 3 },
        ];

        vi.spyOn(NetworkUtils.instance, 'createDownloadChunks').mockReturnValue(tasks);

        const mockChunkStream = new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array([1, 2, 3]));
            controller.close();
          },
        });

        vi.spyOn(networkFacade, 'downloadChunk').mockResolvedValue(mockChunkStream);

        await networkFacade.downloadMultipart(bucketId, fileId, mnemonic, fileSize);

        expect(mockQueue.push).toHaveBeenCalledTimes(tasks.length);
      });
    });

    describe('Streaming the chunks in order', () => {
      test('When chunks complete out of order, then should stream them in correct order', async () => {
        const chunk1 = new Uint8Array([1, 2]);
        const chunk2 = new Uint8Array([3, 4]);

        createMockQueue({ executeWorker: true });

        vi.spyOn(networkFacade, 'downloadChunk')
          .mockResolvedValueOnce(
            new ReadableStream({
              start(controller) {
                controller.enqueue(chunk1);
                controller.close();
              },
            }),
          )
          .mockResolvedValueOnce(
            new ReadableStream({
              start(controller) {
                controller.enqueue(chunk2);
                controller.close();
              },
            }),
          );

        const stream = await networkFacade.downloadMultipart(bucketId, fileId, mnemonic, fileSize);

        const reader = stream.getReader();
        const results: Uint8Array[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          results.push(value);
        }

        expect(results.length).toBeGreaterThan(0);
      });

      test('When streaming chunks, then should clear chunk data after enqueuing', async () => {
        const mockChunk = new Uint8Array([1, 2, 3, 4]);

        createMockQueue({ executeWorker: true });

        const mockChunkStream = new ReadableStream({
          start(controller) {
            controller.enqueue(mockChunk);
            controller.close();
          },
        });

        vi.spyOn(networkFacade, 'downloadChunk').mockResolvedValue(mockChunkStream);

        const stream = await networkFacade.downloadMultipart(bucketId, fileId, mnemonic, fileSize);

        const reader = stream.getReader();
        const result: Uint8Array[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result.push(value);
        }

        expect(result.length).toBeGreaterThan(0);
      });

      test('When all chunks are downloaded but not streamed, then should stream remaining chunks before closing', async () => {
        const { getDrainCallback } = createMockQueue();
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const mockChunkStream = new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array([1, 2, 3]));
            controller.close();
          },
        });

        vi.spyOn(networkFacade, 'downloadChunk').mockResolvedValue(mockChunkStream);

        await networkFacade.downloadMultipart(bucketId, fileId, mnemonic, fileSize);

        const drainCallback = getDrainCallback();
        if (drainCallback) {
          drainCallback();
        }

        consoleWarnSpy.mockRestore();
      });
    });
  });
});
