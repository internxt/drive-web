import { describe, expect, it, beforeEach, vi } from 'vitest';
import backupsService from './backups.service';
import { SdkFactory } from '../../core/factory/sdk';

describe('backupsService', () => {
  const deleteBackupDeviceAsFolderSpy = vi.fn();

  beforeEach(() => {
    const mockStorageClient = {
      deleteBackupDeviceAsFolder: deleteBackupDeviceAsFolderSpy,
    };

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createBackupsClient: () => mockStorageClient,
    } as any);
  });

  describe('deleteBackupDeviceAsFolder', () => {
    const mockFolderId = 'test-folder-id';

    it('should call deleteBackupDeviceAsFolder with the correct folderId', async () => {
      await backupsService.deleteBackupDeviceAsFolder(mockFolderId);

      expect(deleteBackupDeviceAsFolderSpy).toHaveBeenCalledWith(mockFolderId);
    });
  });
});
