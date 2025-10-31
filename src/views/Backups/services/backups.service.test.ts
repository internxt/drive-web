import { describe, expect, it, Mock, vi, beforeEach } from 'vitest';
import backupsService from './backups.service';
import { SdkFactory } from '../../../app/core/factory/sdk';
import { Device } from '@internxt/sdk/dist/drive/backups/types';

vi.mock('../../../app/core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(),
  },
}));

vi.mock('../utils/mappers', () => ({
  mapBackupFolder: vi.fn((folder) => ({ ...folder, mapped: true })),
}));

describe('backupsService', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockBackupsClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockBackupsClient = {
      getBackupDevices: vi.fn(),
      getAllDevicesAsFolder: vi.fn(),
    };
    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createBackupsClient: () => mockBackupsClient,
    });
  });

  describe('getAllDevices', () => {
    it('should filter out devices without IDs', async () => {
      const mockDevices = [
        { id: 1, mac: 'AA:BB:CC:DD:EE:FF', userId: 1 } as Device,
        { id: 0, mac: 'FF:EE:DD:CC:BB:AA', userId: 1 } as Device,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { id: null, mac: 'BB:CC:DD:EE:FF:AA', userId: 1 } as any,
      ];

      mockBackupsClient.getBackupDevices.mockResolvedValue(mockDevices);

      const result = await backupsService.getAllDevices();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });
  });

  describe('getAllDevicesAsFolders', () => {
    it('should filter out deleted folders', async () => {
      const mockFolders = [
        { id: 1, uuid: 'folder-1', deleted: false, plainName: 'Folder 1' },
        { id: 2, uuid: 'folder-2', deleted: true, plainName: 'Deleted Folder' },
        { id: 3, uuid: 'folder-3', deleted: false, plainName: 'Folder 3' },
      ];

      mockBackupsClient.getAllDevicesAsFolder.mockResolvedValue(mockFolders);

      const result = await backupsService.getAllDevicesAsFolders();

      expect(result).toHaveLength(2);
      expect(result.every((folder) => !folder.deleted)).toBe(true);
    });
  });
});
