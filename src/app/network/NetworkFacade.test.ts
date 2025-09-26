import { describe, it, expect, vi, beforeEach, afterEach, test } from 'vitest';
import { NetworkFacade } from './NetworkFacade';
import { Network as NetworkModule } from '@internxt/sdk';
import { downloadFile } from '@internxt/sdk/dist/network/download';
import { decryptStream } from 'app/core/services/stream.service';
import { queue } from 'async';
import { NetworkUtils } from 'app/utils/networkUtils';

vi.mock('@internxt/sdk/dist/network/download');
vi.mock('app/core/services/stream.service');
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
      (decryptStream as any).mockReturnValue(mockDecryptedStream);

      const result = await networkFacade.downloadChunk(bucketId, fileId, mnemonic, chunkStart, chunkEnd);

      expect(result).toStrictEqual(mockDecryptedStream);
      expect(global.fetch).toHaveBeenCalledWith(
        downloadExample,
        expect.objectContaining({
          headers: {
            Range: `bytes=${chunkStart}-${chunkEnd}`,
          },
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

    beforeEach(() => {
      const mockQueue = {
        push: vi.fn(),
        unshift: vi.fn(),
        error: vi.fn(),
        drain: vi.fn(),
        kill: vi.fn(),
        running: vi.fn().mockReturnValue(0),
        length: vi.fn().mockReturnValue(0),
        unsaturated: vi.fn(),
      };
      (queue as any).mockReturnValue(mockQueue);
    });

    test('When downloading a file using chunks, then download the file and stream the chunks in order', async () => {
      const mockChunkData = new Uint8Array([1, 2, 3, 4]);

      const mockQueue = {
        push: vi.fn(),
        unshift: vi.fn(),
        error: vi.fn(),
        drain: vi.fn(),
        kill: vi.fn(),
        running: vi.fn().mockReturnValue(0),
        length: vi.fn().mockReturnValue(0),
      };

      (queue as any).mockReturnValue(mockQueue);

      const mockChunkStream = new ReadableStream({
        start(controller) {
          controller.enqueue(mockChunkData);
          controller.close();
        },
      });

      vi.spyOn(networkFacade, 'downloadChunk').mockResolvedValue(mockChunkStream);

      const streamPromise = networkFacade.downloadMultipart(bucketId, fileId, mnemonic, fileSize);

      await new Promise((resolve) => setTimeout(resolve, 0));

      const stream = await streamPromise;
      expect(stream).toBeInstanceOf(ReadableStream);
    });

    test('When a chunk fails but it is not the last attempt, then should retry the chunk up to 3 times', async () => {
      let queueErrorCallback: any;

      const mockQueue = {
        push: vi.fn(),
        unshift: vi.fn(),
        error: vi.fn((callback) => {
          queueErrorCallback = callback;
        }),
        drain: vi.fn(),
        kill: vi.fn(),
        running: vi.fn().mockReturnValue(0),
        length: vi.fn().mockReturnValue(0),
      };

      (queue as any).mockReturnValue(mockQueue);

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

      if (queueErrorCallback) {
        queueErrorCallback(mockError, task);
      }

      expect(mockQueue.unshift).toHaveBeenCalled();
    });

    test('When a chunk fails and it is the last attempt, then an error indicating so is thrown', async () => {
      let queueErrorCallback: any;
      let capturedController;

      const mockQueue = {
        push: vi.fn(),
        unshift: vi.fn(),
        error: vi.fn((callback) => {
          queueErrorCallback = callback;
        }),
        drain: vi.fn(),
        kill: vi.fn(),
        running: vi.fn().mockReturnValue(0),
        length: vi.fn().mockReturnValue(0),
      };

      (queue as any).mockReturnValue(mockQueue);

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

      vi.spyOn(NetworkUtils.instance, 'createDownloadChunks').mockResolvedValue([task]);

      queueErrorCallback(mockError, task);

      expect(mockAbortController.signal.aborted).toBe(true);
      expect(mockQueue.kill).toHaveBeenCalled();
      expect(capturedController.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Download failed: Download chunk failed',
        }),
      );

      global.ReadableStream = OriginalReadableStream;
    });

    test('When downloading a file using chunks is aborted, then the worker is terminated', async () => {
      const abortController = new AbortController();

      const mockQueue = {
        push: vi.fn(),
        unshift: vi.fn(),
        error: vi.fn(),
        drain: vi.fn(),
        kill: vi.fn(),
        running: vi.fn().mockReturnValue(0),
        length: vi.fn().mockReturnValue(0),
      };

      (queue as any).mockReturnValue(mockQueue);

      vi.spyOn(networkFacade, 'downloadChunk').mockImplementation(() => {
        abortController.abort();
        return Promise.reject(new Error('Download aborted'));
      });

      const streamPromise = networkFacade.downloadMultipart(bucketId, fileId, mnemonic, fileSize, { abortController });

      const stream = await streamPromise;
      expect(stream).toBeInstanceOf(ReadableStream);
    });
  });
});
