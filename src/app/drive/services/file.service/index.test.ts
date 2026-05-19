import { describe, expect, it, vi, beforeEach, test } from 'vitest';
import { deleteFile, moveFileByUuid } from '.';
import { DriveFileData } from 'app/drive/types';
import { EncryptionVersion, FileStatus } from '@internxt/sdk/dist/drive/storage/types';

const mockDeleteFileByUuid = vi.hoisted(() => vi.fn().mockResolvedValue({}));
const mockMoveFileByUuid = vi.hoisted(() => vi.fn());
const mockCreateNewStorageClient = vi.hoisted(() =>
  vi.fn(() => ({ deleteFileByUuid: mockDeleteFileByUuid, moveFileByUuid: mockMoveFileByUuid })),
);
const mockGetNewApiInstance = vi.hoisted(() => vi.fn(() => ({ createNewStorageClient: mockCreateNewStorageClient })));

vi.mock('app/core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: mockGetNewApiInstance,
  },
}));

vi.mock('services/error.service', () => ({
  default: {
    castError: vi.fn((err) => err),
  },
}));

vi.mock('i18next', () => ({
  t: vi.fn((key: string) => key),
}));

describe('fileService', () => {
  vi.mock('./uploadFile', () => ({
    default: vi.fn(),
  }));

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetNewApiInstance.mockImplementation(() => ({ createNewStorageClient: mockCreateNewStorageClient }));
    mockCreateNewStorageClient.mockImplementation(() => ({
      deleteFileByUuid: mockDeleteFileByUuid,
      moveFileByUuid: mockMoveFileByUuid,
    }));
  });

  describe('deleteFileByUuid', () => {
    const mockFile: DriveFileData = {
      id: 0,
      uuid: 'uuid',
      bucket: 'bucket',
      name: 'File1',
      plainName: 'File1',
      plain_name: 'File1',
      type: 'jpg',
      size: 100,
      fileId: 'fileId1',
      folder_id: 1,
      folderId: 1,
      folderUuid: 'uuid1',
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

    it('should call deleteFileByUuid with the correct folderId', async () => {
      await deleteFile(mockFile);

      expect(mockDeleteFileByUuid).toHaveBeenCalledWith(mockFile.uuid);
    });
  });

  describe('moveFileByUuid', () => {
    test('When moving a file with a new name, then the new name is included in the request payload', async () => {
      const fileUuid = 'file-uuid-123';
      const destinationFolderUuid = 'dest-folder-uuid-456';
      const newName = 'renamed-document';
      mockMoveFileByUuid.mockResolvedValue({ id: fileUuid, name: newName });

      await moveFileByUuid(fileUuid, destinationFolderUuid, newName);

      expect(mockMoveFileByUuid).toHaveBeenCalledWith(fileUuid, {
        destinationFolder: destinationFolderUuid,
        name: newName,
      });
    });

    test('When moving a file without specifying a new name, then the name field in the request payload is undefined', async () => {
      const fileUuid = 'file-uuid-123';
      const destinationFolderUuid = 'dest-folder-uuid-456';
      const resolvedFileMeta = { id: 'file-uuid-123', name: 'original-document' };
      mockMoveFileByUuid.mockResolvedValue(resolvedFileMeta);

      await moveFileByUuid(fileUuid, destinationFolderUuid);

      expect(mockMoveFileByUuid).toHaveBeenCalledWith(fileUuid, {
        destinationFolder: destinationFolderUuid,
        name: undefined,
      });
    });
  });
});
