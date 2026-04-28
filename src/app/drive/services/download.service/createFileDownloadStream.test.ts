import { describe, expect, vi, beforeEach, test } from 'vitest';
import { DriveFileData } from '../../types';
import createFileDownloadStream from './createFileDownloadStream';
import fetchFileStream from './fetchFileStream';
import fetchFileStreamUsingCredentials from './fetchFileStreamUsingCredentials';

vi.mock('./fetchFileStream', () => ({ default: vi.fn() }));
vi.mock('./fetchFileStreamUsingCredentials', () => ({ default: vi.fn() }));

const mockReadableStream = new ReadableStream();

const baseFile: DriveFileData = {
  fileId: '123',
  name: 'test.txt',
  type: 'text/plain',
  bucket: 'bucket-id',
} as unknown as DriveFileData;

describe('createFileDownloadStream', () => {
  const mockProgress = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchFileStream).mockResolvedValue(mockReadableStream);
    vi.mocked(fetchFileStreamUsingCredentials).mockResolvedValue(mockReadableStream);
  });

  test('When sharing options are not provided, then the file is downloaded using the default method', async () => {
    const result = await createFileDownloadStream(baseFile, true, mockProgress);

    expect(fetchFileStream).toHaveBeenCalledWith(
      { ...baseFile, bucketId: baseFile.bucket },
      { isWorkspace: true, updateProgressCallback: mockProgress, abortController: undefined },
    );
    expect(fetchFileStreamUsingCredentials).not.toHaveBeenCalled();
    expect(result).toBe(mockReadableStream);
  });

  test('When a cancellation signal is provided without sharing options, then it is forwarded to the download', async () => {
    const abortController = new AbortController();

    await createFileDownloadStream(baseFile, false, mockProgress, abortController);

    expect(fetchFileStream).toHaveBeenCalledWith(
      { ...baseFile, bucketId: baseFile.bucket },
      { isWorkspace: false, updateProgressCallback: mockProgress, abortController },
    );
  });

  test('When sharing options with credentials are provided, then the file is downloaded using those credentials', async () => {
    const abortController = new AbortController();
    const sharingOptions = {
      credentials: { user: 'test-user', pass: 'test-pass' },
      mnemonic: 'test-mnemonic',
    };

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
