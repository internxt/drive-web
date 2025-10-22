import { describe, expect, it, Mock, vi } from 'vitest';
import backupsService from './backups.service';
import { SdkFactory } from '../../../app/core/factory/sdk';

vi.mock('../../../app/core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(),
  },
}));

describe('backupsService', () => {
  describe('deleteBackupDeviceAsFolder', () => {
    const mockFolderId = 'test-folder-id';

    it('should call deleteBackupDeviceAsFolder with the correct folderId', async () => {
      const mockResponse = vi.fn().mockResolvedValue({});
      const mockStorageClient = { deleteBackupDeviceAsFolder: mockResponse };
      (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
        createBackupsClient: () => mockStorageClient,
      });

      await backupsService.deleteBackupDeviceAsFolder(mockFolderId);

      expect(mockStorageClient.deleteBackupDeviceAsFolder).toHaveBeenCalledWith(mockFolderId);
    });
  });
});
