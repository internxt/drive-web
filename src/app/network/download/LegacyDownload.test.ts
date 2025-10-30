import { describe, test, expect, vi, beforeEach } from 'vitest';
import { LegacyDownload } from './LegacyDownload';
import { IDownloadParams } from '../download';
import { MissingAuthenticationError, MissingEncryptionKeyError } from '../errors/download.errors';

vi.mock('../requests');
vi.mock('../crypto');
vi.mock('app/core/services/stream.service');
vi.mock('app/core/services/env.service');
vi.mock('../download');

global.fetch = vi.fn();

describe('Legacy download', () => {
  let legacyDownloadInstance: LegacyDownload;

  beforeEach(() => {
    vi.clearAllMocks();
    legacyDownloadInstance = new LegacyDownload();
  });

  const createMockParamsWithToken = (): IDownloadParams => ({
    bucketId: 'test-bucket',
    fileId: 'test-file',
    token: 'test-token',
    encryptionKey: Buffer.from('0'.repeat(64), 'hex'),
    fileSize: 1024,
    options: {
      notifyProgress: vi.fn(),
      abortController: new AbortController(),
    },
  });

  const createMockParamsWithCreds = (): IDownloadParams => ({
    bucketId: 'test-bucket',
    fileId: 'test-file',
    creds: { user: 'test-user', pass: 'test-pass' },
    mnemonic: 'test mnemonic words',
    fileSize: 1024,
    options: {
      notifyProgress: vi.fn(),
      abortController: new AbortController(),
    },
  });

  describe('downloadFile', () => {
    test('When downloading without token or credentials, then error is thrown', async () => {
      const params: IDownloadParams = {
        bucketId: 'test-bucket',
        fileId: 'test-file',
        fileSize: 1024,
      };

      await expect(legacyDownloadInstance.downloadFile(params)).rejects.toThrow(MissingAuthenticationError);
    });

    test('When downloading without encryptionKey or mnemonic, then error is thrown', async () => {
      const params: IDownloadParams = {
        bucketId: 'test-bucket',
        fileId: 'test-file',
        token: 'test-token',
        fileSize: 1024,
      };

      const { getFileInfoWithToken, getMirrors } = await import('../requests');
      vi.mocked(getFileInfoWithToken).mockResolvedValue({
        index: '0'.repeat(64),
        size: 1024,
      } as any);
      vi.mocked(getMirrors).mockResolvedValue([{ url: 'https://test.com' }] as any);

      await expect(legacyDownloadInstance.downloadFile(params)).rejects.toThrow(MissingEncryptionKeyError);
    });

    test('When downloading with token and encryptionKey, then download succeeds', async () => {
      const params = createMockParamsWithToken();

      const mockStream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.close();
        },
      });

      const { getFileInfoWithToken, getMirrors } = await import('../requests');
      const { buildProgressStream } = await import('app/core/services/stream.service');
      const { getDecryptedStream } = await import('../download');
      const envService = await import('app/core/services/env.service');

      vi.mocked(getFileInfoWithToken).mockResolvedValue({
        index: '0'.repeat(64),
        size: 1024,
      } as any);

      vi.mocked(getMirrors).mockResolvedValue([{ url: 'https://test.com/file' }] as any);

      vi.mocked(global.fetch).mockResolvedValue({
        body: mockStream,
      } as any);

      vi.mocked(getDecryptedStream).mockReturnValue(mockStream);
      vi.mocked(buildProgressStream).mockReturnValue(mockStream);
      vi.mocked(envService.default.getVariable).mockReturnValue('true');

      const result = await legacyDownloadInstance.downloadFile(params);

      expect(result).toBeInstanceOf(ReadableStream);
      expect(getFileInfoWithToken).toHaveBeenCalled();
    });

    test('When downloading with credentials and mnemonic, then download succeeds', async () => {
      const params = createMockParamsWithCreds();

      const mockStream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.close();
        },
      });

      const mockKey = Buffer.from('0'.repeat(64), 'hex');

      const { getFileInfoWithAuth, getMirrors } = await import('../requests');
      const { generateFileKey } = await import('../crypto');
      const { buildProgressStream } = await import('app/core/services/stream.service');
      const { getDecryptedStream } = await import('../download');
      const envService = await import('app/core/services/env.service');

      vi.mocked(getFileInfoWithAuth).mockResolvedValue({
        index: '0'.repeat(64),
        size: 1024,
      } as any);

      vi.mocked(getMirrors).mockResolvedValue([{ url: 'https://test.com/file' }] as any);
      vi.mocked(generateFileKey).mockResolvedValue(mockKey);

      vi.mocked(global.fetch).mockResolvedValue({
        body: mockStream,
      } as any);

      vi.mocked(getDecryptedStream).mockReturnValue(mockStream);
      vi.mocked(buildProgressStream).mockReturnValue(mockStream);
      vi.mocked(envService.default.getVariable).mockReturnValue('true');

      const result = await legacyDownloadInstance.downloadFile(params);

      expect(result).toBeInstanceOf(ReadableStream);
      expect(generateFileKey).toHaveBeenCalled();
    });
  });
});
