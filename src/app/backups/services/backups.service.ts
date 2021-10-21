import { aes } from '@internxt/lib';
import httpService from '../../core/services/http.service';
import { Device, DeviceBackup } from '../types';

const backupsService = {
  async getAllDevices(): Promise<Device[]> {
    const devices = await fetch(`${process.env.REACT_APP_API_URL}/api/backup/device`, {
      method: 'GET',
      headers: httpService.getHeaders(true, false),
    }).then((res) => res.json());
    return devices.filter((device) => device.id);
  },
  async getAllBackups(mac: string): Promise<DeviceBackup[]> {
    const backups = await fetch(`${process.env.REACT_APP_API_URL}/api/backup/${mac}`, {
      method: 'GET',
      headers: httpService.getHeaders(true, false),
    }).then((res) => {
      return res.json();
    });

    return backups.map((backup) => {
      const path = aes.decrypt(backup.path, `${process.env.REACT_APP_CRYPTO_SECRET2}-${backup.bucket}`);
      const name = path.split(/[/\\]/).pop();
      return {
        ...backup,
        path,
        name,
      };
    });
  },
  async deleteBackup(backup: DeviceBackup): Promise<void> {
    const headers = httpService.getHeaders(true, false);
    await fetch(`${process.env.REACT_APP_API_URL}/api/backup/${backup.id}`, {
      method: 'DELETE',
      headers,
    });
  },
};

export default backupsService;
