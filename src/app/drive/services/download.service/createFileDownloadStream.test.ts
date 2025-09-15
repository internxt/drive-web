import { describe, expect, vi, beforeEach, Mock, test } from 'vitest';
import createFileDownloadStream from './createFileDownloadStream';
import fetchFileStream from './fetchFileStream';
import fetchFileStreamUsingCredentials from './fetchFileStreamUsingCredentials';
import { DriveFileData } from '../../types';

vi.mock('./fetchFileStream');
vi.mock('./fetchFileStreamUsingCredentials');

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
    (fetchFileStream as unknown as Mock).mockResolvedValue(mockReadableStream);
    (fetchFileStreamUsingCredentials as unknown as Mock).mockResolvedValue(mockReadableStream);
  });

  test('When sharing options (credentials) are not provided, then fetchFileStream is called', async () => {
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
