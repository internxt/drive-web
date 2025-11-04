import { describe, expect, vi, beforeEach, test } from 'vitest';
import { DriveFileData } from '../../types';

vi.mock('app/network/download');

const mockedSharingOptions = {
  credentials: { user: 'sharing-user', pass: 'sharing-password' },
  mnemonic: 'sharing-mnemonic',
};

const mockedEnvironmentConfig = {
  bridgeUser: 'bridge-user',
  bridgePass: 'bridge-password',
  encryptionKey: 'environment-mnemonic',
};

const baseFile: DriveFileData = {
  fileId: '123',
  name: 'test.txt',
  type: 'text/plain',
  bucket: 'bucket-id',
  size: 1024,
} as DriveFileData;

describe('createMultipartFileDownloadStream', () => {
  const mockProgress = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
  });

  test('When using sharing options, then it should use sharing credentials and mnemonic', async () => {
    const mockReadableStream = new ReadableStream();
    const { multipartDownloadFile } = await import('app/network/download');
    const createMultipartFileDownloadStream = (await import('./createMultipartDownloadStream')).default;

    vi.mocked(multipartDownloadFile).mockResolvedValue(mockReadableStream);

    const result = await createMultipartFileDownloadStream(baseFile, mockProgress, mockedSharingOptions, undefined);

    expect(multipartDownloadFile).toHaveBeenCalledWith({
      bucketId: baseFile.bucket,
      fileId: baseFile.fileId,
      fileSize: baseFile.size,
      creds: {
        user: mockedSharingOptions.credentials.user,
        pass: mockedSharingOptions.credentials.pass,
      },
      mnemonic: mockedSharingOptions.mnemonic,
      options: {
        notifyProgress: expect.any(Function),
        abortController: undefined,
      },
    });
    expect(result).toStrictEqual(mockReadableStream);
  });
});
