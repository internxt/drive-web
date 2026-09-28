import { beforeEach, describe, expect, test, vi } from 'vitest';
import { DriveFileData } from '../types';
import { EncryptionVersion, FileStatus } from '@internxt/sdk/dist/drive/storage/types';
import { LRUFilesCacheManager } from 'app/database/services/database.service/LRUFilesCacheManager';
import { downloadFile } from 'app/network/download';
import { binaryStreamToBlob } from 'services/stream.service';
import { updateDatabaseFileSourceData } from './database.service';
import { downloadFolderAsZip, moveFolderByUuid } from './folder.service';
import { addAllSharedFilesToZip } from './filesZip.service';
import { addAllSharedFoldersToZip } from './foldersZip.service';
import { SharedFiles } from '@internxt/sdk/dist/drive/share/types';
import { FlatFolderZip } from 'services/zip.service';

const mockMoveFolderByUuid = vi.hoisted(() => vi.fn());
const mockCreateNewStorageClient = vi.hoisted(() => vi.fn(() => ({ moveFolderByUuid: mockMoveFolderByUuid })));
const mockGetNewApiInstance = vi.hoisted(() => vi.fn(() => ({ createNewStorageClient: mockCreateNewStorageClient })));

vi.mock('app/core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: mockGetNewApiInstance,
  },
}));

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

vi.mock('./filesZip.service', async (importOriginal) => {
  const original = await importOriginal<typeof import('./filesZip.service')>();
  return {
    ...original,
    addAllSharedFilesToZip: vi.fn(),
  };
});

vi.mock('./foldersZip.service', async (importOriginal) => {
  const original = await importOriginal<typeof import('./foldersZip.service')>();
  return {
    ...original,
    addAllSharedFoldersToZip: vi.fn(),
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
        key: {
          mnemonic: 'test-mnemonic',
        },
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
        key: {
          mnemonic: 'test-mnemonic',
        },
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
          key: {
            mnemonic: 'test-mnemonic',
          },
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
          key: {
            mnemonic: 'test-mnemonic',
          },
        });

        expect(stream).toBeInstanceOf(ReadableStream);
        expect(downloadFile).toHaveBeenCalledWith({
          bucketId: mockFile.bucket,
          fileId: mockFile.fileId,
          creds: { user: 'test-user', pass: 'test-pass' },
          key: {
            mnemonic: 'test-mnemonic',
          },
          options: {
            notifyProgress: expect.any(Function),
            abortController: undefined,
          },
        });
      });
    });
  });

  describe('Download shared folder as zip', () => {
    const CREDENTIALS = { user: 'test-user', pass: 'test-pass' };
    const KEY = { mnemonic: 'test-mnemonic' };

    const createSharedFile = (overrides: Partial<SharedFiles> & { fileId?: string | null } = {}) =>
      ({
        id: 1,
        uuid: 'shared-file-uuid',
        name: 'SharedFile',
        plainName: 'SharedFile',
        type: 'txt',
        size: '100',
        bucket: 'bucket',
        fileId: 'network-file-id',
        folderId: 1,
        updatedAt: new Date().toISOString(),
        ...overrides,
      }) as unknown as SharedFiles;

    const downloadSharedFolder = async (sharedFiles: SharedFiles[]) => {
      const fileStreams: (ReadableStream | undefined)[] = [];
      vi.mocked(addAllSharedFilesToZip).mockImplementation(async (_path, downloadFn) => {
        for (const sharedFile of sharedFiles) {
          fileStreams.push(await downloadFn(sharedFile));
        }
        return { files: sharedFiles, token: '' };
      });
      vi.mocked(addAllSharedFoldersToZip).mockResolvedValue({ folders: [], token: '' } as any);

      const updateProgress = vi.fn();
      const updateNumItems = vi.fn();
      const zip = { abort: vi.fn(), close: vi.fn(), addFile: vi.fn() } as unknown as FlatFolderZip;

      const result = await downloadFolderAsZip({
        folder: { id: 1, name: 'SharedFolder', uuid: 'shared-folder-uuid' },
        isSharedFolder: true,
        foldersIterator: vi.fn(),
        filesIterator: vi.fn(),
        updateProgress,
        updateNumItems,
        options: { credentials: CREDENTIALS, key: KEY, destination: zip, closeWhenFinished: false },
      });

      return { result, fileStreams, updateProgress, updateNumItems };
    };

    beforeEach(() => {
      const mockLruCache = { get: vi.fn().mockResolvedValue(undefined) };
      vi.spyOn(LRUFilesCacheManager, 'getInstance').mockResolvedValue(mockLruCache as any);
    });

    test('When a shared file is empty, then an empty stream is returned without requesting the network', async () => {
      const emptyFile = createSharedFile({ size: '0', fileId: null });

      const { result, fileStreams, updateProgress, updateNumItems } = await downloadSharedFolder([emptyFile]);

      expect(fileStreams[0]).toBeInstanceOf(ReadableStream);
      expect(downloadFile).not.toHaveBeenCalled();
      expect(binaryStreamToBlob).not.toHaveBeenCalled();
      expect(updateDatabaseFileSourceData).not.toHaveBeenCalled();
      expect(updateProgress).toHaveBeenCalledWith(1);
      expect(updateNumItems).toHaveBeenCalledTimes(1);
      expect(result.totalItems).toStrictEqual([emptyFile]);
      expect(result.failedItems).toStrictEqual([]);
    });

    test('When a shared file is not empty nor cached, then it is downloaded with the share credentials and cached', async () => {
      const sharedFile = createSharedFile();
      const downloadedBlob = new Blob(['downloaded content']);
      vi.mocked(downloadFile).mockResolvedValue(new ReadableStream());
      vi.mocked(binaryStreamToBlob).mockResolvedValue(downloadedBlob);

      const { result, fileStreams } = await downloadSharedFolder([sharedFile]);

      expect(downloadFile).toHaveBeenCalledWith({
        bucketId: 'bucket',
        fileId: 'network-file-id',
        creds: CREDENTIALS,
        key: KEY,
      });
      expect(updateDatabaseFileSourceData).toHaveBeenCalledWith({
        folderId: sharedFile.folderId,
        sourceBlob: downloadedBlob,
        fileId: sharedFile.id,
        updatedAt: sharedFile.updatedAt,
      });
      expect(fileStreams[0]).toBeInstanceOf(ReadableStream);
      expect(result.failedItems).toStrictEqual([]);
    });

    test('When a shared file is cached and not older, then the cached stream is returned without downloading', async () => {
      const sharedFile = createSharedFile({ updatedAt: '2020-01-01T00:00:00.000Z' });
      const mockLruCache = {
        get: vi.fn().mockResolvedValue({ source: new Blob(['cached content']), updatedAt: new Date().toISOString() }),
      };
      vi.spyOn(LRUFilesCacheManager, 'getInstance').mockResolvedValue(mockLruCache as any);

      const { fileStreams, updateProgress } = await downloadSharedFolder([sharedFile]);

      expect(fileStreams[0]).toBeInstanceOf(ReadableStream);
      expect(downloadFile).not.toHaveBeenCalled();
      expect(updateProgress).toHaveBeenCalledWith(1);
    });

    test('When the download of a shared file fails, then it is added to the failed items', async () => {
      const sharedFile = createSharedFile();
      vi.mocked(downloadFile).mockRejectedValue(new Error('download failed'));

      const { result, fileStreams } = await downloadSharedFolder([sharedFile]);

      expect(fileStreams[0]).toBeUndefined();
      expect(result.failedItems).toStrictEqual([sharedFile]);
      expect(result.allItemsFailed).toBe(true);
    });
  });

  describe('moveFolderByUuid', () => {
    test('When moving a folder with a new name, then the new name is included in the request payload', async () => {
      const folderUuid = 'folder-uuid-123';
      const destinationFolderUuid = 'dest-folder-uuid-456';
      const newName = 'renamed-folder';
      const resolvedFolderMeta = { id: 'folder-uuid-123', name: newName };
      mockMoveFolderByUuid.mockResolvedValue(resolvedFolderMeta);

      await moveFolderByUuid(folderUuid, destinationFolderUuid, newName);

      expect(mockMoveFolderByUuid).toHaveBeenCalledWith(folderUuid, {
        destinationFolder: destinationFolderUuid,
        name: newName,
      });
    });

    test('When moving a folder without specifying a new name, then the name field in the request payload is undefined', async () => {
      const folderUuid = 'folder-uuid-123';
      const destinationFolderUuid = 'dest-folder-uuid-456';
      const resolvedFolderMeta = { id: 'folder-uuid-123', name: 'original-folder' };
      mockMoveFolderByUuid.mockResolvedValue(resolvedFolderMeta);

      await moveFolderByUuid(folderUuid, destinationFolderUuid);

      expect(mockMoveFolderByUuid).toHaveBeenCalledWith(folderUuid, {
        destinationFolder: destinationFolderUuid,
        name: undefined,
      });
    });
  });
});
