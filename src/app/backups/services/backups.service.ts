import { aes } from '@internxt/lib';
import { Device, DeviceBackup } from '@internxt/sdk/dist/drive/backups/types';
import { SdkFactory } from '../../core/factory/sdk';
import { mapBackupFolder } from '../utils/mappers';
import { DriveFolderData } from '../../drive/types';

const backupsService = {
  async getAllDevices(): Promise<Device[]> {
    const backupsClient = SdkFactory.getNewApiInstance().createBackupsClient();
    const devices = await backupsClient.getBackupDevices();
    return devices.filter((device) => device.id);
  },

  async getAllDevicesAsFolders(): Promise<DriveFolderData[]> {
    const backupsClient = SdkFactory.getNewApiInstance().createBackupsClient();
    const encryptedFolders = await backupsClient.getAllDevicesAsFolder();
    return encryptedFolders.map(mapBackupFolder);
  },

  async getAllBackups(mac: string): Promise<DeviceBackup[]> {
    const backupsClient = SdkFactory.getNewApiInstance().createBackupsClient();
    const backups = await backupsClient.getAllBackups(mac);
    return backups.map((backup) => {
      const path = aes.decrypt(backup.path, `${process.env.REACT_APP_CRYPTO_SECRET2}-${backup.bucket}`);
      const name = path.split(/[/\\]/).pop() as string;
      return {
        ...backup,
        path,
        name,
      };
    });
  },

  deleteBackup(backup: DeviceBackup): Promise<void> {
    const backupsClient = SdkFactory.getNewApiInstance().createBackupsClient();
    return backupsClient.deleteBackup(backup.id);
  },

  deleteDevice(device: Device): Promise<void> {
    const backupsClient = SdkFactory.getNewApiInstance().createBackupsClient();
    return backupsClient.deleteBackupDevice(device.id);
  },
};

export default backupsService;
