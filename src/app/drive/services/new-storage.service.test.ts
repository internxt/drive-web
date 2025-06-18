import { describe, expect, it, vi } from 'vitest';

const deleteFolderByUuidMock = vi.fn();
vi.mock('../../core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(() => ({
      createNewStorageClient: vi.fn(() => ({
        getFolderContentByUuid: vi.fn(),
        deleteFolderByUuid: deleteFolderByUuidMock,
      })),
    })),
  },
}));

import newStorageService from './new-storage.service';

describe('backupsService', () => {
  describe('deleteFolderByUuid', () => {
    const mockFolderId = 'test-folder-id';

    it('should call deleteFolderByUuid with the correct folderId', async () => {
      await newStorageService.deleteFolderByUuid(mockFolderId);

      expect(deleteFolderByUuidMock).toHaveBeenCalledWith(mockFolderId);
    });
  });
});
