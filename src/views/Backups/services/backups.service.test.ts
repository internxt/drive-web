import { describe, expect, it, Mock, vi, beforeEach } from 'vitest';
import backupsService from './backups.service';
import { SdkFactory } from '../../../app/core/factory/sdk';
import { Device, DeviceBackup } from '@internxt/sdk/dist/drive/backups/types';

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
      getAllBackups: vi.fn(),
      deleteBackup: vi.fn(),
      deleteBackupDevice: vi.fn(),
      deleteBackupDeviceAsFolder: vi.fn(),
    };
    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createBackupsClient: () => mockBackupsClient,
    });
  });

  describe('getAllDevices', () => {
    it('should return all devices with valid IDs', async () => {
      const mockDevices: Device[] = [
        { id: 1, mac: 'AA:BB:CC:DD:EE:FF', userId: 1 } as Device,
        { id: 2, mac: 'FF:EE:DD:CC:BB:AA', userId: 1 } as Device,
      ];

      mockBackupsClient.getBackupDevices.mockResolvedValue(mockDevices);

      const result = await backupsService.getAllDevices();

      expect(mockBackupsClient.getBackupDevices).toHaveBeenCalled();
      expect(result).toEqual(mockDevices);
    });

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
    it('should return all non-deleted devices as folders', async () => {
      const mockFolders = [
        { id: 1, uuid: 'folder-1', deleted: false, plainName: 'Folder 1' },
        { id: 2, uuid: 'folder-2', deleted: false, plainName: 'Folder 2' },
      ];

      mockBackupsClient.getAllDevicesAsFolder.mockResolvedValue(mockFolders);

      const result = await backupsService.getAllDevicesAsFolders();

      expect(mockBackupsClient.getAllDevicesAsFolder).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('mapped', true);
    });

    it('should filter out deleted folders', async () => {
      const mockFolders = [
        { id: 1, uuid: 'folder-1', deleted: false, plainName: 'Folder 1' },
        { id: 2, uuid: 'folder-2', deleted: true, plainName: 'Deleted Folder' },
        { id: 3, uuid: 'folder-3', deleted: false, plainName: 'Folder 3' },
      ];

      mockBackupsClient.getAllDevicesAsFolder.mockResolvedValue(mockFolders);

      const result = await backupsService.getAllDevicesAsFolders();

      expect(result).toHaveLength(2);
      expect(result.every((folder) => folder.deleted === false)).toBe(true);
    });
  });

  describe('getAllBackups', () => {
    it('should return all backups for a given MAC address', async () => {
      const mac = 'AA:BB:CC:DD:EE:FF';
      const mockBackups = [
        { id: 1, name: 'Backup 1' },
        { id: 2, name: 'Backup 2' },
      ] as unknown as DeviceBackup[];

      mockBackupsClient.getAllBackups.mockResolvedValue(mockBackups);

      const result = await backupsService.getAllBackups(mac);

      expect(mockBackupsClient.getAllBackups).toHaveBeenCalledWith(mac);
      expect(result).toEqual(mockBackups);
    });
  });

  describe('deleteBackup', () => {
    it('should delete a backup by ID', async () => {
      const mockBackup = { id: 123, name: 'Backup 1' } as unknown as DeviceBackup;

      mockBackupsClient.deleteBackup.mockResolvedValue(undefined);

      await backupsService.deleteBackup(mockBackup);

      expect(mockBackupsClient.deleteBackup).toHaveBeenCalledWith(123);
    });
  });

  describe('deleteDevice', () => {
    it('should delete a device by ID', async () => {
      const mockDevice: Device = { id: 456, mac: 'AA:BB:CC:DD:EE:FF', userId: 1 } as Device;

      mockBackupsClient.deleteBackupDevice.mockResolvedValue(undefined);

      await backupsService.deleteDevice(mockDevice);

      expect(mockBackupsClient.deleteBackupDevice).toHaveBeenCalledWith(456);
    });
  });

  describe('deleteBackupDeviceAsFolder', () => {
    it('should delete a backup device as folder by UUID', async () => {
      const mockFolderId = 'test-folder-uuid';

      mockBackupsClient.deleteBackupDeviceAsFolder.mockResolvedValue(undefined);

      await backupsService.deleteBackupDeviceAsFolder(mockFolderId);

      expect(mockBackupsClient.deleteBackupDeviceAsFolder).toHaveBeenCalledWith(mockFolderId);
    });
  });
});
