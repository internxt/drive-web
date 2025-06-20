import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { deleteFile } from '.';
import { SdkFactory } from '../../../core/factory/sdk';
import { DriveFileData } from '../../../drive/types';
import { EncryptionVersion, FileStatus } from '@internxt/sdk/dist/drive/storage/types';

describe('fileService', () => {
  let storageClientMock;

  beforeEach(() => {
    storageClientMock = {
      deleteFileByUuid: vi.fn(),
    };

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createNewStorageClient: () => storageClientMock,
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
      const deleteFileByUuidSpy = vi.spyOn(storageClientMock, 'deleteFileByUuid');

      await deleteFile(mockFile);

      expect(deleteFileByUuidSpy).toHaveBeenCalledWith(mockFile.uuid);
    });
  });
});
