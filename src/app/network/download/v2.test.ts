import { describe, test, expect, vi, beforeEach } from 'vitest';
import { downloadChunkFile, multipartDownload } from './v2';
import { MultipartDownload } from './MultipartDownload';
import envService from 'services/env.service';
import { Network } from '@internxt/sdk/dist/network';
import { NetworkFacade } from '../NetworkFacade';
import downloadFile from './v2';

vi.mock('../../crypto/services/utils');

describe('Download V2', () => {
  const mockStream = new ReadableStream<Uint8Array>();
  const mockCredentials = {
    user: 'test-user',
    pass: 'test-pass',
  };

  const mockHashedPassword = 'hashed-password';
  const mockBridgeUrl = 'https://bridge.internxt.com';
  const mockNetworkClient = {};
  const mnemonic = 'test mnemonic';
  const bucketId = 'test-bucket-id';
  const fileId = 'test-file-id';
  const bucketKey = Buffer.alloc(32, 0x03);
  const token = 'shared-token';

  beforeEach(async () => {
    vi.clearAllMocks();
    const { getSha256 } = await import('../../crypto/services/utils');
    vi.mocked(getSha256).mockResolvedValue(mockHashedPassword);

    vi.spyOn(envService, 'getVariable').mockReturnValue(mockBridgeUrl);
  });

  describe('Multipart Download', () => {
    test('When multipart download is called, then the facade is created correctly, the multipart download method is called with correct params, and returns the stream', async () => {
      const abortController = new AbortController();
      const progressCallback = vi.fn();
      const params = {
        bucketId,
        fileId,
        creds: mockCredentials,
        key: { mnemonic },
        fileSize: 1024,
        options: {
          notifyProgress: progressCallback,
          abortController,
        },
      };

      const networkClientSpy = vi.spyOn(Network, 'client').mockReturnValue(mockNetworkClient as any);

      const downloadFileSpy = vi.spyOn(MultipartDownload.prototype, 'downloadFile').mockResolvedValue(mockStream);

      const result = await multipartDownload(params);

      expect(networkClientSpy).toHaveBeenCalledWith(
        mockBridgeUrl,
        {
          clientName: 'drive-web',
          clientVersion: '1.0',
        },
        {
          bridgeUser: mockCredentials.user,
          userId: mockHashedPassword,
        },
      );
      expect(downloadFileSpy).toHaveBeenCalledWith({
        bucketId: params.bucketId,
        fileId: params.fileId,
        key: params.key,
        fileSize: params.fileSize,
        options: {
          downloadingCallback: progressCallback,
          abortController,
        },
      });
      expect(result).toStrictEqual(mockStream);
    });
  });

  describe('Download single chunk', () => {
    test('When download a single chunk is called, then the facade is created correctly, the download a single chunk method is called with correct params, and returns the stream', async () => {
      const abortController = new AbortController();
      const progressCallback = vi.fn();
      const params = {
        bucketId,
        fileId,
        creds: mockCredentials,
        key: { mnemonic },
        fileSize: 1024,
        chunkStart: 0,
        chunkEnd: 1024,
        options: {
          notifyProgress: progressCallback,
          abortController,
        },
      };

      const networkClientSpy = vi.spyOn(Network, 'client').mockReturnValue(mockNetworkClient as any);

      const downloadSingleFileSpy = vi.spyOn(NetworkFacade.prototype, 'downloadChunk').mockResolvedValue(mockStream);

      const result = await downloadChunkFile(params);

      expect(networkClientSpy).toHaveBeenCalledWith(
        mockBridgeUrl,
        {
          clientName: 'drive-web',
          clientVersion: '1.0',
        },
        {
          bridgeUser: mockCredentials.user,
          userId: mockHashedPassword,
        },
      );
      expect(downloadSingleFileSpy).toHaveBeenCalledWith({
        bucketId: params.bucketId,
        fileId: params.fileId,
        key: params.key,
        chunkStart: params.chunkStart,
        chunkEnd: params.chunkEnd,
        options: {
          downloadingCallback: progressCallback,
          abortController,
        },
      });
      expect(result).toStrictEqual(mockStream);
    });
  });

  describe('downloadFile dispatcher', () => {
    test('When token and mnemonic are provided, downloadSharedFile is called', async () => {
      const abortController = new AbortController();
      const progressCallback = vi.fn();
      const downloadSpy = vi.spyOn(NetworkFacade.prototype, 'download').mockResolvedValue(mockStream);
      const networkClientSpy = vi.spyOn(Network, 'client').mockReturnValue(mockNetworkClient as any);

      const result = await downloadFile({
        bucketId,
        fileId,
        key: { mnemonic },
        token,
        options: { notifyProgress: progressCallback, abortController },
      } as any);

      expect(networkClientSpy).toHaveBeenCalledWith(
        mockBridgeUrl,
        { clientName: 'drive-web', clientVersion: '1.0' },
        { bridgeUser: '', userId: '' },
      );
      expect(downloadSpy).toHaveBeenCalledWith(bucketId, fileId, mnemonic, {
        token,
        downloadingCallback: progressCallback,
        abortController,
      });
      expect(result).toStrictEqual(mockStream);
    });

    test('When token and key.bucketKey are provided, downloadSharedFile is called with the bucket key', async () => {
      const abortController = new AbortController();
      const progressCallback = vi.fn();

      const downloadWithBucketKeySpy = vi
        .spyOn(NetworkFacade.prototype, 'downloadWithBucketKey')
        .mockResolvedValue(mockStream);
      const networkClientSpy = vi.spyOn(Network, 'client').mockReturnValue(mockNetworkClient as any);

      const result = await downloadFile({
        bucketId,
        fileId,
        key: { bucketKey },
        token,
        options: { notifyProgress: progressCallback, abortController },
      } as any);

      expect(networkClientSpy).toHaveBeenCalledWith(
        mockBridgeUrl,
        { clientName: 'drive-web', clientVersion: '1.0' },
        { bridgeUser: '', userId: '' },
      );
      expect(downloadWithBucketKeySpy).toHaveBeenCalledWith(bucketId, fileId, bucketKey, {
        token,
        downloadingCallback: progressCallback,
        abortController,
      });
      expect(result).toStrictEqual(mockStream);
    });

    test('When creds and key.mnemonic are provided, downloadOwnFile is called', async () => {
      const abortController = new AbortController();
      const progressCallback = vi.fn();

      const downloadSpy = vi.spyOn(NetworkFacade.prototype, 'download').mockResolvedValue(mockStream);
      const networkClientSpy = vi.spyOn(Network, 'client').mockReturnValue(mockNetworkClient as any);

      const result = await downloadFile({
        bucketId,
        fileId,
        creds: mockCredentials,
        key: { mnemonic },
        options: { notifyProgress: progressCallback, abortController },
      } as any);

      expect(networkClientSpy).toHaveBeenCalledWith(
        mockBridgeUrl,
        { clientName: 'drive-web', clientVersion: '1.0' },
        { bridgeUser: mockCredentials.user, userId: mockHashedPassword },
      );
      expect(downloadSpy).toHaveBeenCalledWith(bucketId, fileId, 'test mnemonic', {
        downloadingCallback: progressCallback,
        abortController,
      });
      expect(result).toStrictEqual(mockStream);
    });

    test('When creds and key.bucketKey are provided, downloadOwnFileWithBucketKey is called', async () => {
      const abortController = new AbortController();
      const progressCallback = vi.fn();
      const downloadWithBucketKeySpy = vi
        .spyOn(NetworkFacade.prototype, 'downloadWithBucketKey')
        .mockResolvedValue(mockStream);
      const networkClientSpy = vi.spyOn(Network, 'client').mockReturnValue(mockNetworkClient as any);

      const result = await downloadFile({
        bucketId,
        fileId,
        creds: mockCredentials,
        key: { bucketKey },
        options: { notifyProgress: progressCallback, abortController },
      } as any);

      expect(networkClientSpy).toHaveBeenCalledWith(
        mockBridgeUrl,
        { clientName: 'drive-web', clientVersion: '1.0' },
        { bridgeUser: mockCredentials.user, userId: mockHashedPassword },
      );
      expect(downloadWithBucketKeySpy).toHaveBeenCalledWith(bucketId, fileId, bucketKey, {
        downloadingCallback: progressCallback,
        abortController,
      });
      expect(result).toStrictEqual(mockStream);
    });

    test('When no valid combination is provided, an error is thrown', () => {
      expect(() =>
        downloadFile({
          bucketId,
          fileId,
        } as any),
      ).toThrow('DOWNLOAD ERRNO. 0');
    });
  });
});
