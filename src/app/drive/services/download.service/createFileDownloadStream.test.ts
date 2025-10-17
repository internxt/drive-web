import { describe, expect, vi, beforeEach, test } from 'vitest';
import { DriveFileData } from '../../types';

const mockReadableStream = new ReadableStream();

const mockedSharingOptions = {
  credentials: { user: 'user', pass: 'hashed-password' },
  mnemonic: 'mnemonic',
};

const baseFile: DriveFileData = {
  fileId: '123',
  name: 'test.txt',
  type: 'text/plain',
  bucket: 'bucket-id',
  mnemonic: 'random-mnemonic',
} as unknown as DriveFileData;

describe('createFileDownloadStream', () => {
  const mockProgress = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  test('When we want to create a file download stream, then we use the multipart download', async () => {
    vi.doMock('app/network/download', () => ({
      multipartDownloadFile: vi.fn().mockResolvedValue(mockReadableStream),
    }));
    const createFileDownloadStream = (await import('./createFileDownloadStream')).default;
    const multipartDownloadFile = (await import('app/network/download')).multipartDownloadFile;

    const result = await createFileDownloadStream(baseFile, mockProgress, undefined, mockedSharingOptions);

    expect(multipartDownloadFile).toHaveBeenCalledWith({
      bucketId: baseFile.bucket,
      fileId: baseFile.fileId,
      fileSize: baseFile.size,
      creds: mockedSharingOptions.credentials,
      mnemonic: mockedSharingOptions.mnemonic,
      options: { notifyProgress: expect.any(Function), abortController: undefined },
    });

    expect(result).toBe(mockReadableStream);
  });
});
