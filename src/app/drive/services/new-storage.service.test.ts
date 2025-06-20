import { describe, expect, it, vi, beforeEach } from 'vitest';
import newStorageService from './new-storage.service';
import { SdkFactory } from '../../core/factory/sdk';

describe('backupsService', () => {
  const deleteFolderByUuidSpy = vi.fn();

  beforeEach(() => {
    const mockStorageClient = {
      deleteFolderByUuid: deleteFolderByUuidSpy,
    };

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createNewStorageClient: () => mockStorageClient,
    } as any);
  });

  describe('deleteFolderByUuid', () => {
    const mockFolderId = 'test-folder-id';

    it('should call deleteFolderByUuid with the correct folderId', async () => {
      await newStorageService.deleteFolderByUuid(mockFolderId);
      expect(deleteFolderByUuidSpy).toHaveBeenCalledWith(mockFolderId);
    });
  });
});
