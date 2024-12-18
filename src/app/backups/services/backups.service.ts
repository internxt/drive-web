import { aes } from '@internxt/lib';
import { Device, DeviceBackup } from '@internxt/sdk/dist/drive/backups/types';
import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import { SdkFactory } from '../../core/factory/sdk';
import httpService from '../../core/services/http.service';

const backupsService = {
  async getAllDevices(): Promise<Device[]> {
    const backupsClient = SdkFactory.getInstance().createBackupsClient();
    const devices = await backupsClient.getAllDevices();
    return devices.filter((device) => device.id);
  },

  async getAllDevicesAsFolders(): Promise<DriveFolderData[]> {
    const serviceHeaders = httpService.getHeaders(true, false);
    const headers = httpService.convertHeadersToNativeHeaders(serviceHeaders);
    const res = await fetch(`${process.env.REACT_APP_API_URL}/backup/deviceAsFolder`, {
      headers: headers,
    });
    if (res.ok) {
      const encryptedFolders = await res.json();
      return encryptedFolders.map(({ name, ...rest }: DriveFolderData) => ({
        name: aes.decrypt(name, `${process.env.REACT_APP_CRYPTO_SECRET2}-${rest.bucket}`),
        ...rest,
        isFolder: true,
      }));
    } else return [];
  },

  async getAllBackups(mac: string): Promise<DeviceBackup[]> {
    const backupsClient = SdkFactory.getInstance().createBackupsClient();
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
    const backupsClient = SdkFactory.getInstance().createBackupsClient();
    return backupsClient.deleteBackup(backup.id);
  },
  deleteDevice(device: Device): Promise<void> {
    const backupsClient = SdkFactory.getInstance().createBackupsClient();
    return backupsClient.deleteDevice(device.id);
  },
};

export default backupsService;
