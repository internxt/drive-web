import { aes } from '@internxt/lib';
import { createBackupsClient } from '../../core/factory/sdk';
import { Device, DeviceBackup } from '@internxt/sdk/dist/drive/backups/types';

const backupsService = {
  async getAllDevices(): Promise<Device[]> {
    const devices = await createBackupsClient().getAllDevices();
    return devices.filter((device) => device.id);
  },

  async getAllBackups(mac: string): Promise<DeviceBackup[]> {
    const backups = await createBackupsClient().getAllBackups(mac);
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
    return createBackupsClient().deleteBackup(backup.id);
  },
  deleteDevice(device: Device): Promise<void> {
    return createBackupsClient().deleteDevice(device.id);
  },
};

export default backupsService;
