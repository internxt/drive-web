import { beforeEach, describe, expect, test, vi } from 'vitest';
import { DriveFileData } from '../types';
import { EncryptionVersion, FileStatus } from '@internxt/sdk/dist/drive/storage/types';
import { LRUFilesCacheManager } from 'app/database/services/database.service/LRUFilesCacheManager';
import { downloadFile } from 'app/network/download';
import { binaryStreamToBlob } from 'services/stream.service';
import { updateDatabaseFileSourceData } from './database.service';

vi.mock('app/network/download', () => ({
  downloadFile: vi.fn(),
  getDecryptedStream: vi.fn(),
}));

vi.mock('services/stream.service', () => ({
  binaryStreamToBlob: vi.fn(),
  buildProgressStream: vi.fn(),
  decryptStream: vi.fn(),
}));

vi.mock('./database.service', async (importOriginal) => {
  const original = await importOriginal<typeof import('./database.service')>();
  return {
    ...original,
    updateDatabaseFileSourceData: vi.fn(),
  };
});

describe('Folder Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockFile: DriveFileData = {
    id: 1,
    uuid: 'file-uuid',
    bucket: 'bucket',
    name: 'TestFile',
    plainName: 'TestFile',
    plain_name: 'TestFile',
    type: 'txt',
    size: 100,
    fileId: 'fileId1',
    folder_id: 1,
    folderId: 1,
    folderUuid: 'folder-uuid',
    createdAt: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deleted: false,
    deletedAt: null,
    currentThumbnail: null,
    encrypt_version: EncryptionVersion.Aes03,
    status: FileStatus.EXISTS,
    thumbnails: [],
  };

  const mockEmptyFile: DriveFileData = {
    ...mockFile,
    id: 2,
    name: 'EmptyFile',
    size: 0,
  };

  describe('Get File Stream', () => {
    test('When the file is empty, then it should return an empty stream without downloading', async () => {
      const { getFileStream } = await import('./folder.service');

      const mockLruCache = {
        get: vi.fn().mockResolvedValue(undefined),
      };
      vi.spyOn(LRUFilesCacheManager, 'getInstance').mockResolvedValue(mockLruCache as any);

      const stream = await getFileStream({
        file: mockEmptyFile,
        creds: { user: 'test-user', pass: 'test-pass' },
        mnemonic: 'test-mnemonic',
      });

      expect(stream).toBeInstanceOf(ReadableStream);
      expect(downloadFile).not.toHaveBeenCalled();
      expect(binaryStreamToBlob).not.toHaveBeenCalled();
      expect(updateDatabaseFileSourceData).not.toHaveBeenCalled();
    });

    test('When the file is cached and not older, then it should return the cached stream', async () => {
      const { getFileStream } = await import('./folder.service');

      const cachedBlob = new Blob(['cached content']);
      const mockLruCache = {
        get: vi.fn().mockResolvedValue({
          source: cachedBlob,
          updatedAt: new Date().toISOString(),
        }),
      };
      vi.spyOn(LRUFilesCacheManager, 'getInstance').mockResolvedValue(mockLruCache as any);

      const stream = await getFileStream({
        file: mockFile,
        creds: { user: 'test-user', pass: 'test-pass' },
        mnemonic: 'test-mnemonic',
      });

      expect(stream).toBeInstanceOf(ReadableStream);
      expect(downloadFile).not.toHaveBeenCalled();
    });

    describe('The file is not empty and is not cached', () => {
      test('When the download starts, the download progress of the file should be reported correctly', async () => {
        const { getFileStream } = await import('./folder.service');

        const mockDownloadProgress = vi.fn();
        const mockLruCache = {
          get: vi.fn().mockResolvedValue(undefined),
        };
        vi.spyOn(LRUFilesCacheManager, 'getInstance').mockResolvedValue(mockLruCache as any);

        const mockDownloadedStream = new ReadableStream();

        // Simulate the download progress
        vi.mocked(downloadFile).mockImplementation(async ({ options }) => {
          if (options?.notifyProgress) {
            options.notifyProgress(0, 25);
            options.notifyProgress(0, 50);
            options.notifyProgress(0, 75);
            options.notifyProgress(0, 100);
          }
          return mockDownloadedStream as any;
        });

        const mockBlob = new Blob(['downloaded content']);
        vi.mocked(binaryStreamToBlob).mockResolvedValue(mockBlob);
        vi.mocked(updateDatabaseFileSourceData).mockResolvedValue();

        await getFileStream({
          file: mockFile,
          creds: { user: 'test-user', pass: 'test-pass' },
          mnemonic: 'test-mnemonic',
          downloadProgress: mockDownloadProgress,
        });

        const totalBytesReported = mockDownloadProgress.mock.calls.reduce((sum, call) => sum + call[0], 0);

        expect(totalBytesReported).toBe(mockFile.size);
      });

      test('When the download starts, then it should be completed successfully', async () => {
        const { getFileStream } = await import('./folder.service');

        const mockLruCache = {
          get: vi.fn().mockResolvedValue(undefined),
        };
        vi.spyOn(LRUFilesCacheManager, 'getInstance').mockResolvedValue(mockLruCache as any);

        const mockDownloadedStream = new ReadableStream();
        vi.mocked(downloadFile).mockResolvedValue(mockDownloadedStream as any);

        const mockBlob = new Blob(['downloaded content']);
        vi.mocked(binaryStreamToBlob).mockResolvedValue(mockBlob);
        vi.mocked(updateDatabaseFileSourceData).mockResolvedValue();

        const stream = await getFileStream({
          file: mockFile,
          creds: { user: 'test-user', pass: 'test-pass' },
          mnemonic: 'test-mnemonic',
        });

        expect(stream).toBeInstanceOf(ReadableStream);
        expect(downloadFile).toHaveBeenCalledWith({
          bucketId: mockFile.bucket,
          fileId: mockFile.fileId,
          creds: { user: 'test-user', pass: 'test-pass' },
          mnemonic: 'test-mnemonic',
          options: {
            notifyProgress: expect.any(Function),
            abortController: undefined,
          },
        });
      });
    });
  });
});
