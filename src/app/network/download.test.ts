import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('./download/v2');
vi.mock('./requests');
vi.mock('./crypto');
vi.mock('app/core/services/stream.service');
vi.mock('app/core/services/env.service');

import { IDownloadParams, multipartDownloadFile } from './download';
import { DownloadFailedWithUnknownError } from './errors/download.errors';

describe('Multipart Download File', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When multipart download is called with own file params, then it is called with correct params', async () => {
    const mockStream = new ReadableStream();
    const params: IDownloadParams & { fileSize: number } = {
      bucketId: 'test-bucket',
      fileId: 'test-file',
      creds: { user: 'test-user', pass: 'test-pass' },
      mnemonic: 'test-mnemonic',
      fileSize: 1024,
      options: {
        notifyProgress: vi.fn(),
        abortController: new AbortController(),
      },
    };

    const { multipartDownload } = await import('./download/v2');
    vi.mocked(multipartDownload).mockResolvedValue(mockStream);

    const result = await multipartDownloadFile(params);

    expect(multipartDownload).toHaveBeenCalledWith({
      bucketId: params.bucketId,
      fileId: params.fileId,
      creds: params.creds,
      mnemonic: params.mnemonic,
      fileSize: params.fileSize,
      options: params.options,
    });
    expect(result).toStrictEqual(mockStream);
  });

  test('When multipart download is called with shared file params, then it falls back to regular download', async () => {
    const mockStream = new ReadableStream();
    const params: IDownloadParams & { fileSize?: number } = {
      bucketId: 'test-bucket',
      fileId: 'test-file',
      token: 'test-token',
      encryptionKey: Buffer.from('0'.repeat(64), 'hex'),
      fileSize: 1024,
      options: {
        notifyProgress: vi.fn(),
        abortController: new AbortController(),
      },
    };

    const { getFileInfoWithToken, getMirrors } = await import('./requests');
    vi.mocked(getFileInfoWithToken).mockResolvedValue({
      bucket: 'test-bucket',
      mimetype: 'text/plain',
      filename: 'test-file',
      frame: 'test-frame',
      size: 1024,
      id: 'test-id',
      created: new Date(),
      hmac: { value: 'test-hmac', type: 'sha256' },
      index: '0'.repeat(64),
    } as any);
    vi.mocked(getMirrors).mockResolvedValue([{ url: 'http://test-mirror.com' }] as any);

    const { buildProgressStream } = await import('app/core/services/stream.service');
    vi.mocked(buildProgressStream).mockReturnValue(mockStream);

    global.fetch = vi.fn().mockResolvedValue({
      body: new ReadableStream(),
    });

    const result = await multipartDownloadFile(params);

    expect(result).toBeDefined();
    expect(result).toStrictEqual(mockStream);
    expect(getFileInfoWithToken).toHaveBeenCalledWith(params.bucketId, params.fileId, params.token);
  });

  test('When there is an unknown error, then an error indicating so is thrown', async () => {
    const unknownError = new DownloadFailedWithUnknownError(500);
    const params: IDownloadParams & { fileSize: number } = {
      bucketId: 'test-bucket',
      fileId: 'test-file',
      creds: { user: 'test-user', pass: 'test-pass' },
      mnemonic: 'test-mnemonic',
      fileSize: 1024,
      options: {
        notifyProgress: vi.fn(),
        abortController: new AbortController(),
      },
    };

    const { multipartDownload } = await import('./download/v2');
    vi.mocked(multipartDownload).mockRejectedValue(unknownError);

    await expect(multipartDownloadFile(params)).rejects.toThrow(unknownError);
    expect(multipartDownload).toHaveBeenCalledWith({
      bucketId: params.bucketId,
      fileId: params.fileId,
      creds: params.creds,
      mnemonic: params.mnemonic,
      fileSize: params.fileSize,
      options: params.options,
    });
  });
});
