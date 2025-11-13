import { describe, expect, it, Mock, vi } from 'vitest';
import newStorageService from './new-storage.service';
import { SdkFactory } from 'app/core/factory/sdk';

vi.mock('app/core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(),
  },
}));

describe('backupsService', () => {
  describe('deleteFolderByUuid', () => {
    const mockFolderId = 'test-folder-id';

    it('should call deleteFolderByUuid with the correct folderId', async () => {
      const mockResponse = vi.fn().mockResolvedValue({});
      const mockStorageClient = { deleteFolderByUuid: mockResponse };
      (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
        createNewStorageClient: () => mockStorageClient,
      });

      await newStorageService.deleteFolderByUuid(mockFolderId);

      expect(mockStorageClient.deleteFolderByUuid).toHaveBeenCalledWith(mockFolderId);
    });
  });
});
