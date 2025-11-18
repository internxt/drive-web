import { describe, test, expect, vi, beforeEach } from 'vitest';
import { multipartDownload } from './v2';
import { MultipartDownload } from './MultipartDownload';
import envService from 'services/env.service';
import { Network } from '@internxt/sdk/dist/network';

vi.mock('../../crypto/services/utils');

describe('Download V2', () => {
  const mockStream = new ReadableStream<Uint8Array>();
  const mockCredentials = {
    user: 'test-user',
    pass: 'test-pass',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Multipart Download', () => {
    test('When multipart download is called, then the facade is created correctly, the multipart download method is called with correct params, and returns the stream', async () => {
      const abortController = new AbortController();
      const progressCallback = vi.fn();
      const params = {
        bucketId: 'test-bucket',
        fileId: 'test-file',
        creds: mockCredentials,
        mnemonic: 'test mnemonic',
        fileSize: 1024,
        options: {
          notifyProgress: progressCallback,
          abortController,
        },
      };

      const mockHashedPassword = 'hashed-password';
      const mockBridgeUrl = 'https://bridge.internxt.com';
      const mockNetworkClient = {};

      const { getSha256 } = await import('../../crypto/services/utils');
      vi.mocked(getSha256).mockResolvedValue(mockHashedPassword);

      vi.spyOn(envService, 'getVariable').mockReturnValue(mockBridgeUrl);

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
        mnemonic: params.mnemonic,
        fileSize: params.fileSize,
        options: {
          downloadingCallback: progressCallback,
          abortController,
        },
      });
      expect(result).toStrictEqual(mockStream);
    });
  });
});
