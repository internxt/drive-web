import { Device, DeviceBackup } from '@internxt/sdk/dist/drive/backups/types';
import { SdkFactory } from 'app/core/factory/sdk';
import { mapBackupFolder } from '../utils/mappers';
import { DriveFolderData } from 'app/drive/types';

const backupsService = {
  async getAllDevices(): Promise<Device[]> {
    const backupsClient = await SdkFactory.getNewApiInstance().createBackupsClient();
    const devices = await backupsClient.getBackupDevices();
    return devices.filter((device) => device.id);
  },

  async getAllDevicesAsFolders(): Promise<DriveFolderData[]> {
    const backupsClient = await SdkFactory.getNewApiInstance().createBackupsClient();
    const encryptedFolders = await backupsClient.getAllDevicesAsFolder();
    return encryptedFolders.filter((folder) => !folder.deleted).map(mapBackupFolder);
  },

  async getAllBackups(mac: string): Promise<DeviceBackup[]> {
    const backupsClient = await SdkFactory.getNewApiInstance().createBackupsClient();
    const backups = await backupsClient.getAllBackups(mac);
    return backups;
  },

  async deleteBackup(backup: DeviceBackup): Promise<void> {
    const backupsClient = await SdkFactory.getNewApiInstance().createBackupsClient();
    return backupsClient.deleteBackup(backup.id);
  },

  async deleteDevice(device: Device): Promise<void> {
    const backupsClient = await SdkFactory.getNewApiInstance().createBackupsClient();
    return backupsClient.deleteBackupDevice(device.id);
  },

  async deleteBackupDeviceAsFolder(folderId: string) {
    const backupsClient = await SdkFactory.getNewApiInstance().createBackupsClient();
    return backupsClient.deleteBackupDeviceAsFolder(folderId);
  },
};

export default backupsService;
