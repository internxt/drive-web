import { describe, test, expect, vi, beforeEach } from 'vitest';
import { IDownloadParams } from './download';
import { FileVersionOneError } from '@internxt/sdk/dist/network/download';
import { downloadFileV2 } from './download/v2';
import { multipartDownloadFile } from './download';
import { legacyDownload } from './download/LegacyDownload';
import { MaxRetriesExceededError } from './errors/download.errors';

describe('Download functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockParams = (): IDownloadParams => ({
    bucketId: 'bucket-id',
    fileId: 'random-file-id',
    creds: { user: 'user', pass: 'hashed-password' },
    encryptionKey: Buffer.from('encryption-key', 'hex'),
    mnemonic: 'mnemonic',
    fileSize: 1024,
    options: {
      notifyProgress: () => {},
      abortController: new AbortController(),
    },
    token: 'user-token',
  });

  describe('Multipart download', () => {
    test('When multipart download is called, then the correct function is called with its params and a readable stream is returned', async () => {
      const params = createMockParams();
      const mockStream = new ReadableStream<Uint8Array>();

      const multipartDownloadSpy = vi.spyOn(downloadFileV2, 'multipartDownload').mockResolvedValue(mockStream);

      const result = await multipartDownloadFile(params);

      expect(multipartDownloadSpy).toHaveBeenCalledWith(params);
      expect(multipartDownloadSpy).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockStream);
    });

    test('When multipart download throws an error indicating that the file is version 1, then the legacy download function is called', async () => {
      const params = createMockParams();
      const legacyMockStream = new ReadableStream<Uint8Array>();
      const fileVersionOneError = new FileVersionOneError();

      const legacyFileDownloadSpy = vi.spyOn(legacyDownload, 'downloadFile').mockResolvedValue(legacyMockStream);
      vi.spyOn(downloadFileV2, 'multipartDownload').mockRejectedValue(fileVersionOneError);

      const result = await multipartDownloadFile(params);

      expect(legacyFileDownloadSpy).toHaveBeenCalledWith(params);
      expect(legacyFileDownloadSpy).toHaveBeenCalledTimes(1);
      expect(result).toStrictEqual(legacyMockStream);
    });

    test('When multipart download throws a different error, then the error is propagated', async () => {
      const params = createMockParams();
      const networkError = new MaxRetriesExceededError(3, 'Network Error');

      vi.spyOn(downloadFileV2, 'multipartDownload').mockRejectedValue(networkError);

      await expect(multipartDownloadFile(params)).rejects.toThrow(networkError);
    });
  });
});
