/* eslint-disable no-constant-condition */
import { describe, it, expect, vi, beforeEach, afterEach, test } from 'vitest';
import { NetworkFacade } from './NetworkFacade';
import { Network as NetworkModule } from '@internxt/sdk';
import { downloadFile } from '@internxt/sdk/dist/network/download';
import { decryptStream } from 'services/stream.service';
import {
  DownloadAbortedByUserError,
  DownloadFailedWithUnknownError,
  NoContentReceivedError,
} from './errors/download.errors';

vi.mock('@internxt/sdk/dist/network/download');
vi.mock('services/stream.service', () => ({
  binaryStreamToBlob: vi.fn(),
  buildProgressStream: vi.fn(),
  decryptStream: vi.fn(),
  joinReadableBinaryStreams: vi.fn(),
}));

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

      const result = await networkFacade.downloadChunk({ bucketId, fileId, mnemonic, chunkStart, chunkEnd });

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

      await expect(networkFacade.downloadChunk({ bucketId, fileId, mnemonic, chunkStart, chunkEnd })).rejects.toThrow(
        new DownloadFailedWithUnknownError(mockResponse.status),
      );
    });

    test('When there is no body in the response, then an error indicating so is thrown', async () => {
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

      await expect(networkFacade.downloadChunk({ bucketId, fileId, mnemonic, chunkStart, chunkEnd })).rejects.toThrow(
        NoContentReceivedError,
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
        networkFacade.downloadChunk({
          bucketId,
          fileId,
          mnemonic,
          chunkStart,
          chunkEnd,
          options: {
            abortController,
          },
        }),
      ).rejects.toThrow(DownloadAbortedByUserError);
    });
  });
});
