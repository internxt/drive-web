import { describe, expect, it, vi } from 'vitest';

const deleteFolderByUuidMock = vi.fn();
vi.mock('../../../core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(() => ({
      createNewStorageClient: vi.fn(() => ({
        getRecentFilesV2: vi.fn(),
        deleteFileByUuid: deleteFolderByUuidMock,
        updateFileNameWithUUID: vi.fn(),
        getFile: vi.fn(),
      })),
    })),
  },
}));

vi.mock('./uploadFile', () => ({
  default: {
    uploadFile: vi.fn(),
  },
}));

import { deleteFile } from '.';
import { EncryptionVersion, FileStatus } from '@internxt/sdk/dist/drive/storage/types';

describe('fileService', () => {
  describe('deleteFileByUuid', () => {
    const mockFile = {
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
      deleteFolderByUuidMock.mockResolvedValue({});
      await deleteFile(mockFile);

      expect(deleteFolderByUuidMock).toHaveBeenCalledWith(mockFile.uuid);
    });
  });
});
