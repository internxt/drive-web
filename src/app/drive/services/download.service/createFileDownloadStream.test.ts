import { describe, expect, vi, beforeEach, test } from 'vitest';
import { DriveFileData } from '../../types';

const mockReadableStream = new ReadableStream();

const baseFile: DriveFileData = {
  fileId: '123',
  name: 'test.txt',
  type: 'text/plain',
  bucket: 'bucket-id',
} as unknown as DriveFileData;

describe('createFileDownloadStream', () => {
  const mockProgress = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  test('When sharing options (credentials) are not provided, then fetchFileStream is called', async () => {
    vi.doMock('./fetchFileStream', () => ({
      default: vi.fn().mockResolvedValue(mockReadableStream),
    }));

    vi.doMock('./fetchFileStreamUsingCredentials', () => ({
      default: vi.fn().mockResolvedValue(mockReadableStream),
    }));
    const createFileDownloadStream = (await import('./createFileDownloadStream')).default;
    const fetchFileStream = (await import('./fetchFileStream')).default;
    const fetchFileStreamUsingCredentials = (await import('./fetchFileStreamUsingCredentials')).default;

    const result = await createFileDownloadStream(baseFile, true, mockProgress);

    expect(fetchFileStream).toHaveBeenCalledWith(
      { ...baseFile, bucketId: baseFile.bucket },
      { isWorkspace: true, updateProgressCallback: mockProgress, abortController: undefined },
    );
    expect(fetchFileStreamUsingCredentials).not.toHaveBeenCalled();
    expect(result).toBe(mockReadableStream);
  });

  test('When sharing options (credentials) are provided, then fetchFileStreamUsingCredentials is called', async () => {
    const abortController = new AbortController();
    const sharingOptions = {
      credentials: { user: 'test-user', pass: 'test-pass' },
      mnemonic: 'test-mnemonic',
    };
    vi.doMock('./fetchFileStream', () => ({
      default: vi.fn().mockResolvedValue(mockReadableStream),
    }));

    vi.doMock('./fetchFileStreamUsingCredentials', () => ({
      default: vi.fn().mockResolvedValue(mockReadableStream),
    }));
    const createFileDownloadStream = (await import('./createFileDownloadStream')).default;
    const fetchFileStream = (await import('./fetchFileStream')).default;
    const fetchFileStreamUsingCredentials = (await import('./fetchFileStreamUsingCredentials')).default;

    const result = await createFileDownloadStream(baseFile, false, mockProgress, abortController, sharingOptions);

    expect(fetchFileStreamUsingCredentials).toHaveBeenCalledWith(
      { ...baseFile, bucketId: baseFile.bucket },
      {
        updateProgressCallback: mockProgress,
        abortController,
        creds: sharingOptions.credentials,
        mnemonic: sharingOptions.mnemonic,
      },
    );
    expect(fetchFileStream).not.toHaveBeenCalled();
    expect(result).toBe(mockReadableStream);
  });
});
