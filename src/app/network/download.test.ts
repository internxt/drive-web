import { describe, test, expect, vi, beforeEach } from 'vitest';

vi.mock('./download/v2');
vi.mock('./requests');
vi.mock('./crypto');
vi.mock('app/core/services/stream.service');
vi.mock('app/core/services/env.service');

import { multipartDownloadFile, IDownloadParams } from './download';
import { DownloadFailedWithUnknownError } from './errors/download.errors';

describe('Multipart Download File', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When multipart download is called, then it is called with correct params', async () => {
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

    const { multipartDownload } = await import('./download/v2');
    vi.mocked(multipartDownload).mockResolvedValue(mockStream);

    const result = await multipartDownloadFile(params);

    expect(multipartDownload).toHaveBeenCalledWith(params);
    expect(result).toStrictEqual(mockStream);
  });

  test('When there is an unknown error, then an error indicating so is thrown', async () => {
    const unknownError = new DownloadFailedWithUnknownError(500);
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

    const { multipartDownload } = await import('./download/v2');
    vi.mocked(multipartDownload).mockRejectedValue(unknownError);

    await expect(multipartDownloadFile(params)).rejects.toThrow(unknownError);
    expect(multipartDownload).toHaveBeenCalledWith(params);
  });
});
