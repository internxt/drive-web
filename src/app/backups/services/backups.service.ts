import { aes } from '@internxt/lib';
import httpService from '../../core/services/http.service';
import { Device, DeviceBackup } from '../types';

const backupsService = {
  async getAllDevices(): Promise<Device[]> {
    const devices = await httpService.get<Device[]>('/api/backup/device');

    return devices.filter((device) => device.id);
  },

  async getAllBackups(mac: string): Promise<DeviceBackup[]> {
    const backups = await httpService.get<DeviceBackup[]>(`/api/backup/${mac}`);

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
    await httpService.delete<void>(`/api/backup/${backup.id}`);
  },
};

export default backupsService;
