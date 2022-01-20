import { aes } from '@internxt/lib';
import httpService from '../../core/services/http.service';
import { createBackupsClient } from '../../../factory/modules';
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

  async deleteBackup(backup: DeviceBackup): Promise<void> {
    await createBackupsClient().deleteBackup(backup.id);
  },
  async deleteDevice(device: Device): Promise<void> {
    await httpService.delete<void>(`/api/backup/device/${device.id}`);
  },
};

export default backupsService;
