import { describe, beforeEach, test, expect, vi } from 'vitest';
import { IDownloadParams } from '../download';
import {
  MissingAuthenticationError,
  MissingEncryptionKeyError,
  NoContentReceivedError,
} from '../errors/download.errors';
import { LegacyDownload } from './LegacyDownload';

vi.mock('../requests');
vi.mock('../crypto');
vi.mock('app/core/services/stream.service');
vi.mock('app/core/services/env.service');
vi.mock('../download');

global.fetch = vi.fn();

const MOCK_FILE_INFO = {
  index: '0'.repeat(64),
  size: 1024,
  bucket: 'test-bucket',
  id: 'test-file',
  filename: 'test.txt',
  mimetype: 'text/plain',
};

const MOCK_MIRRORS = [{ url: 'https://mirror1.test.com/file' }, { url: 'https://mirror2.test.com/file' }];

const createMockStream = (): ReadableStream<Uint8Array> => {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2, 3]));
      controller.close();
    },
  });
};

const createMockParamsWithToken = (overrides?: Partial<IDownloadParams>): IDownloadParams => ({
  bucketId: 'test-bucket',
  fileId: 'test-file',
  token: 'test-token',
  encryptionKey: Buffer.from('0'.repeat(64), 'hex'),
  fileSize: 1024,
  options: {
    notifyProgress: vi.fn(),
    abortController: new AbortController(),
  },
  ...overrides,
});

const createMockParamsWithCreds = (overrides?: Partial<IDownloadParams>): IDownloadParams => ({
  bucketId: 'test-bucket',
  fileId: 'test-file',
  creds: { user: 'test-user', pass: 'test-pass' },
  mnemonic: 'test mnemonic words',
  fileSize: 1024,
  options: {
    notifyProgress: vi.fn(),
    abortController: new AbortController(),
  },
  ...overrides,
});

describe('LegacyDownload', () => {
  let legacyDownload: LegacyDownload;

  beforeEach(() => {
    vi.clearAllMocks();
    legacyDownload = new LegacyDownload();
  });

  describe('Download with token', () => {
    test('When downloading with valid token and encryption key, then correct methods are called with correct parameters', async () => {
      const params = createMockParamsWithToken();
      const mockStream = createMockStream();

      const { getFileInfoWithToken, getMirrors } = await import('../requests');
      const { buildProgressStream } = await import('app/core/services/stream.service');
      const { getDecryptedStream } = await import('../download');
      const envService = await import('app/core/services/env.service');

      vi.mocked(getFileInfoWithToken).mockResolvedValue(MOCK_FILE_INFO as any);
      vi.mocked(getMirrors).mockResolvedValue(MOCK_MIRRORS as any);
      vi.mocked(global.fetch).mockResolvedValue({ body: mockStream } as any);
      vi.mocked(getDecryptedStream).mockReturnValue(mockStream);
      vi.mocked(buildProgressStream).mockReturnValue(mockStream);
      vi.mocked(envService.default.getVariable).mockReturnValue('true');

      const result = await legacyDownload.downloadFile(params);

      expect(getFileInfoWithToken).toHaveBeenCalledWith('test-bucket', 'test-file', 'test-token');
      expect(getMirrors).toHaveBeenCalledWith('test-bucket', 'test-file', null, 'test-token');
      expect(global.fetch).toHaveBeenCalledTimes(MOCK_MIRRORS.length);
      expect(getDecryptedStream).toHaveBeenCalledWith(expect.any(Array), expect.any(Object));
      expect(buildProgressStream).toHaveBeenCalledWith(mockStream, expect.any(Function));
      expect(result).toBeInstanceOf(ReadableStream);
    });

    test('When downloading with token, then progress callback is called with correct values', async () => {
      const progressCallback = vi.fn();
      const params = createMockParamsWithToken({
        options: {
          notifyProgress: progressCallback,
          abortController: new AbortController(),
        },
      });

      const mockStream = createMockStream();

      const { getFileInfoWithToken, getMirrors } = await import('../requests');
      const { buildProgressStream } = await import('app/core/services/stream.service');
      const { getDecryptedStream } = await import('../download');
      const envService = await import('app/core/services/env.service');

      vi.mocked(getFileInfoWithToken).mockResolvedValue(MOCK_FILE_INFO as any);
      vi.mocked(getMirrors).mockResolvedValue(MOCK_MIRRORS as any);
      vi.mocked(global.fetch).mockResolvedValue({ body: mockStream } as any);
      vi.mocked(getDecryptedStream).mockReturnValue(mockStream);
      vi.mocked(envService.default.getVariable).mockReturnValue('true');

      vi.mocked(buildProgressStream).mockImplementation((stream, callback) => {
        callback(512);
        return mockStream;
      });

      await legacyDownload.downloadFile(params);

      expect(progressCallback).toHaveBeenCalledWith(MOCK_FILE_INFO.size, 512);
    });
  });

  describe('Download with credentials', () => {
    test('When downloading with valid credentials and mnemonic, then encryption key is generated correctly', async () => {
      const params = createMockParamsWithCreds();
      const mockStream = createMockStream();
      const mockGeneratedKey = Buffer.from('A'.repeat(64), 'hex');

      const { getFileInfoWithAuth, getMirrors } = await import('../requests');
      const { generateFileKey } = await import('../crypto');
      const { buildProgressStream } = await import('app/core/services/stream.service');
      const { getDecryptedStream } = await import('../download');
      const envService = await import('app/core/services/env.service');

      vi.mocked(getFileInfoWithAuth).mockResolvedValue(MOCK_FILE_INFO as any);
      vi.mocked(getMirrors).mockResolvedValue(MOCK_MIRRORS as any);
      vi.mocked(generateFileKey).mockResolvedValue(mockGeneratedKey);
      vi.mocked(global.fetch).mockResolvedValue({ body: mockStream } as any);
      vi.mocked(getDecryptedStream).mockReturnValue(mockStream);
      vi.mocked(buildProgressStream).mockReturnValue(mockStream);
      vi.mocked(envService.default.getVariable).mockReturnValue('true');

      await legacyDownload.downloadFile(params);

      expect(generateFileKey).toHaveBeenCalledWith(
        params.mnemonic,
        params.bucketId,
        Buffer.from(MOCK_FILE_INFO.index, 'hex'),
      );
      expect(getFileInfoWithAuth).toHaveBeenCalledWith('test-bucket', 'test-file', params.creds);
      expect(getMirrors).toHaveBeenCalledWith('test-bucket', 'test-file', params.creds);
    });

    test('When downloading with credentials, then correct authentication methods are used', async () => {
      const params = createMockParamsWithCreds();
      const mockStream = createMockStream();

      const { getFileInfoWithAuth, getMirrors } = await import('../requests');
      const { generateFileKey } = await import('../crypto');
      const { buildProgressStream } = await import('app/core/services/stream.service');
      const { getDecryptedStream } = await import('../download');
      const envService = await import('app/core/services/env.service');

      vi.mocked(getFileInfoWithAuth).mockResolvedValue(MOCK_FILE_INFO as any);
      vi.mocked(getMirrors).mockResolvedValue(MOCK_MIRRORS as any);
      vi.mocked(generateFileKey).mockResolvedValue(Buffer.from('0'.repeat(64), 'hex'));
      vi.mocked(global.fetch).mockResolvedValue({ body: mockStream } as any);
      vi.mocked(getDecryptedStream).mockReturnValue(mockStream);
      vi.mocked(buildProgressStream).mockReturnValue(mockStream);
      vi.mocked(envService.default.getVariable).mockReturnValue('true');

      const result = await legacyDownload.downloadFile(params);

      expect(getMirrors).toHaveBeenCalledWith('test-bucket', 'test-file', params.creds);
      expect(result).toBeInstanceOf(ReadableStream);
    });
  });

  describe('Error handling', () => {
    test('When fetch returns no body, then an error indicating so is thrown', async () => {
      const params = createMockParamsWithToken();

      const { getFileInfoWithToken, getMirrors } = await import('../requests');
      const envService = await import('app/core/services/env.service');

      vi.mocked(getFileInfoWithToken).mockResolvedValue(MOCK_FILE_INFO as any);
      vi.mocked(getMirrors).mockResolvedValue(MOCK_MIRRORS as any);
      vi.mocked(global.fetch).mockResolvedValue({ body: null } as any);
      vi.mocked(envService.default.getVariable).mockReturnValue('true');

      await expect(legacyDownload.downloadFile(params)).rejects.toThrow(NoContentReceivedError);
    });

    test('When download is aborted, then fetch receives abort signal', async () => {
      const abortController = new AbortController();
      const params = createMockParamsWithToken({
        options: {
          notifyProgress: vi.fn(),
          abortController,
        },
      });

      const mockStream = createMockStream();

      const { getFileInfoWithToken, getMirrors } = await import('../requests');
      const { buildProgressStream } = await import('app/core/services/stream.service');
      const { getDecryptedStream } = await import('../download');
      const envService = await import('app/core/services/env.service');

      vi.mocked(getFileInfoWithToken).mockResolvedValue(MOCK_FILE_INFO as any);
      vi.mocked(getMirrors).mockResolvedValue(MOCK_MIRRORS as any);
      vi.mocked(global.fetch).mockResolvedValue({ body: mockStream } as any);
      vi.mocked(getDecryptedStream).mockReturnValue(mockStream);
      vi.mocked(buildProgressStream).mockReturnValue(mockStream);
      vi.mocked(envService.default.getVariable).mockReturnValue('true');

      await legacyDownload.downloadFile(params);

      expect(global.fetch).toHaveBeenCalledWith(expect.any(String), { signal: abortController.signal });
    });

    describe('Authentication validation', () => {
      test('When downloading without token or credentials, then an error indicating so is thrown', async () => {
        const params: IDownloadParams = {
          bucketId: 'test-bucket',
          fileId: 'test-file',
          fileSize: 1024,
          encryptionKey: Buffer.from('0'.repeat(64), 'hex'),
        };

        await expect(legacyDownload.downloadFile(params)).rejects.toThrow(MissingAuthenticationError);
      });

      test('When downloading with token but without encryptionKey or mnemonic, then an error indicating so is thrown', async () => {
        const params: IDownloadParams = {
          bucketId: 'test-bucket',
          fileId: 'test-file',
          token: 'test-token',
          fileSize: 1024,
        };

        const { getFileInfoWithToken, getMirrors } = await import('../requests');
        vi.mocked(getFileInfoWithToken).mockResolvedValue(MOCK_FILE_INFO as any);
        vi.mocked(getMirrors).mockResolvedValue(MOCK_MIRRORS as any);

        await expect(legacyDownload.downloadFile(params)).rejects.toThrow(MissingEncryptionKeyError);
      });

      test('When downloading with credentials but without mnemonic or encryptionKey, then an error indicating so is thrown', async () => {
        const params: IDownloadParams = {
          bucketId: 'test-bucket',
          fileId: 'test-file',
          creds: { user: 'test-user', pass: 'test-pass' },
          fileSize: 1024,
        };

        const { getFileInfoWithAuth, getMirrors } = await import('../requests');
        vi.mocked(getFileInfoWithAuth).mockResolvedValue(MOCK_FILE_INFO as any);
        vi.mocked(getMirrors).mockResolvedValue(MOCK_MIRRORS as any);

        await expect(legacyDownload.downloadFile(params)).rejects.toThrow(MissingEncryptionKeyError);
      });
    });
  });
});
