import { describe, expect, it, Mock, vi, beforeEach } from 'vitest';
import { deleteFile } from '.';
import { SdkFactory } from '../../../core/factory/sdk';
import { DriveFileData } from '../../../drive/types';
import { EncryptionVersion, FileStatus } from '@internxt/sdk/dist/drive/storage/types';

vi.mock('../../../core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(),
  },
}));

vi.mock('./uploadFile', () => ({
  default: vi.fn(),
}));

describe('fileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
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
      const mockResponse = vi.fn().mockResolvedValue({});
      const mockStorageClient = { deleteFileByUuid: mockResponse };
      (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
        createNewStorageClient: () => mockStorageClient,
      });

      await deleteFile(mockFile);

      expect(mockStorageClient.deleteFileByUuid).toHaveBeenCalledWith(mockFile.uuid);
    });
  });
});
