/* eslint-disable no-constant-condition */
import { describe, it, expect, vi, beforeEach, afterEach, test } from 'vitest';
import { NetworkFacade } from './NetworkFacade';
import { Network as NetworkModule } from '@internxt/sdk';
import { downloadFile } from '@internxt/sdk/dist/network/download';
import { uploadFile } from '@internxt/sdk/dist/network/upload';
import { buildProgressStream, decryptStream } from 'services/stream.service';
import { createSha256HashingStream } from './crypto';
import { getDecryptedStream } from './download';
import { getFileHmacFromShardHashes, getRipemd160FromHex } from 'app/crypto/services/utils';
import {
  DownloadAbortedByUserError,
  DownloadFailedWithUnknownError,
  NoContentReceivedError,
} from './errors/download.errors';

vi.mock('@internxt/sdk/dist/network/download', () => ({
  downloadFile: vi.fn(),
}));
vi.mock('@internxt/sdk/dist/network/upload', () => ({
  uploadFile: vi.fn(),
  uploadMultipartFile: vi.fn(),
}));
vi.mock('services/stream.service', () => ({
  binaryStreamToBlob: vi.fn(),
  buildProgressStream: vi.fn(),
  decryptStream: vi.fn(),
  joinReadableBinaryStreams: vi.fn(),
}));
vi.mock('./crypto', () => ({
  createSha256HashingStream: vi.fn(),
  encryptStreamInParts: vi.fn(),
  generateFileKey: vi.fn(),
  getEncryptedFile: vi.fn(),
  processEveryFileBlobReturnHash: vi.fn(),
}));
vi.mock('./download', () => ({
  getDecryptedStream: vi.fn(),
}));
vi.mock('app/crypto/services/utils', () => ({
  getFileHmacFromShardHashes: vi.fn(),
  getRipemd160FromHex: vi.fn(),
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

  describe('Downloading a file', () => {
    const downloadUrl = 'http://s3.inxt.download.com/example';
    const bucketId = 'test-bucket';
    const fileId = 'test-file';
    const mnemonic = 'test-mnemonic';
    const fakeKey = Buffer.alloc(32);
    const fakeIv = Buffer.alloc(16);
    const fakeShardHash = 'aabbcc';
    const fakeRipemd160Hash = 'ddeeff';

    function mockDownloadFile(fileInfoOverride: object = {}) {
      (downloadFile as any).mockImplementation(async (_fId, _bId, _mn, _net, _crypto, _buf, downloadCb, decryptCb) => {
        await downloadCb([{ url: downloadUrl }], { size: 100, ...fileInfoOverride });
        await decryptCb('AES256CTR', fakeKey, fakeIv, 100);
      });
    }

    beforeEach(() => {
      const mockHashingStream = new ReadableStream({ start: (c) => c.close() });
      const mockDecryptedStream = new ReadableStream({ start: (c) => c.close() });
      const mockProgressStream = new ReadableStream({ start: (c) => c.close() });

      (global.fetch as any).mockResolvedValue({ body: new ReadableStream() });
      vi.mocked(createSha256HashingStream).mockImplementation(async (_src, onHash) => {
        onHash(fakeShardHash);
        return mockHashingStream;
      });
      vi.mocked(getRipemd160FromHex).mockResolvedValue(fakeRipemd160Hash);
      vi.mocked(getDecryptedStream).mockReturnValue(mockDecryptedStream);
      vi.mocked(buildProgressStream).mockReturnValue(mockProgressStream);
    });

    test('When fileInfo has no HMAC, the download resolves without integrity check', async () => {
      mockDownloadFile();
      vi.mocked(getFileHmacFromShardHashes).mockResolvedValue('any-hmac');

      const result = await networkFacade.download(bucketId, fileId, mnemonic);

      expect(result).toBeDefined();
      expect(buildProgressStream).toHaveBeenCalledOnce();
    });

    test('When the computed HMAC matches fileInfo.hmac.value, onFinished resolves without error', async () => {
      const expectedHmac = 'matching-hmac-value';
      mockDownloadFile({ hmac: { type: 'sha512', value: expectedHmac } });
      vi.mocked(getFileHmacFromShardHashes).mockResolvedValue(expectedHmac);

      let capturedOnFinished: (() => Promise<void>) | undefined;
      vi.mocked(buildProgressStream).mockImplementation((_src, _onRead, onFinished) => {
        capturedOnFinished = onFinished;
        return new ReadableStream({ start: (c) => c.close() });
      });

      await networkFacade.download(bucketId, fileId, mnemonic);

      await expect(capturedOnFinished?.()).resolves.toBeUndefined();
    });

    test('When the computed HMAC does not match fileInfo.hmac.value, onFinished throws', async () => {
      mockDownloadFile({ hmac: { type: 'sha512', value: 'expected-hmac' } });
      vi.mocked(getFileHmacFromShardHashes).mockResolvedValue('different-hmac');

      let capturedOnFinished: (() => Promise<void>) | undefined;
      vi.mocked(buildProgressStream).mockImplementation((_src, _onRead, onFinished) => {
        capturedOnFinished = onFinished;
        return new ReadableStream({ start: (c) => c.close() });
      });

      await networkFacade.download(bucketId, fileId, mnemonic);

      await expect(capturedOnFinished?.()).rejects.toThrow('File integrity check failed');
    });

    test('When a shard is downloaded, its SHA256 hash is computed via createSha256HashingStream', async () => {
      mockDownloadFile();
      vi.mocked(getFileHmacFromShardHashes).mockResolvedValue('any-hmac');

      await networkFacade.download(bucketId, fileId, mnemonic);

      expect(createSha256HashingStream).toHaveBeenCalledOnce();
    });

    test('When computing the HMAC, getFileHmacFromShardHashes receives the shard hashes collected during download', async () => {
      mockDownloadFile({ hmac: { type: 'sha512', value: 'some-hmac' } });
      vi.mocked(getFileHmacFromShardHashes).mockResolvedValue('some-hmac');

      let capturedOnFinished: (() => Promise<void>) | undefined;
      vi.mocked(buildProgressStream).mockImplementation((_src, _onRead, onFinished) => {
        capturedOnFinished = onFinished;
        return new ReadableStream({ start: (c) => c.close() });
      });

      await networkFacade.download(bucketId, fileId, mnemonic);
      await capturedOnFinished?.();

      expect(getFileHmacFromShardHashes).toHaveBeenCalledWith(fakeKey, [fakeRipemd160Hash]);
    });
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

    it('When the download is aborted, then an DownloadAbortedByUserError error is thrown', async () => {
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

  describe('Uploading a file', () => {
    const fakeKey = Buffer.alloc(32, 0x01);
    const fakeShardHash = 'aabbcc';

    test('computeHmac is provided in the cryptoLib passed to the SDK', async () => {
      let capturedCrypto: NetworkModule.Crypto | undefined;
      vi.mocked(uploadFile).mockImplementation(async (_net, crypto) => {
        capturedCrypto = crypto;
        return 'file-id';
      });

      await networkFacade.upload('bucket', 'mnemonic', new File([''], 'test.txt'), { uploadingCallback: vi.fn() });

      expect(capturedCrypto?.computeHmac).toBeDefined();
    });

    test('computeHmac calls getFileHmacFromShardHashes with the file key and shard hashes', async () => {
      let capturedCrypto: NetworkModule.Crypto | undefined;
      vi.mocked(uploadFile).mockImplementation(async (_net, crypto) => {
        capturedCrypto = crypto;
        return 'file-id';
      });
      vi.mocked(getFileHmacFromShardHashes).mockResolvedValue('computed-hmac');

      await networkFacade.upload('bucket', 'mnemonic', new File([''], 'test.txt'), { uploadingCallback: vi.fn() });
      await capturedCrypto?.computeHmac?.(fakeKey, [fakeShardHash]);

      expect(getFileHmacFromShardHashes).toHaveBeenCalledWith(fakeKey, [fakeShardHash]);
    });

    test('computeHmac returns the HMAC value with type sha512', async () => {
      let capturedCrypto: NetworkModule.Crypto | undefined;
      vi.mocked(uploadFile).mockImplementation(async (_net, crypto) => {
        capturedCrypto = crypto;
        return 'file-id';
      });
      vi.mocked(getFileHmacFromShardHashes).mockResolvedValue('computed-hmac-value');

      await networkFacade.upload('bucket', 'mnemonic', new File([''], 'test.txt'), { uploadingCallback: vi.fn() });
      const result = await capturedCrypto?.computeHmac?.(fakeKey, [fakeShardHash]);

      expect(result).toEqual({ type: 'sha512', value: 'computed-hmac-value' });
    });
  });
});
