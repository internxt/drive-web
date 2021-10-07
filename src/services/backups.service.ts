import { getHeaders } from '../lib/auth';
import { DeviceBackup, Device } from '../models/interfaces';
import { aes } from '@internxt/lib';

const backupsService = {
  async getAllDevices(): Promise<Device[]> {
    const devices = await fetch(`${process.env.REACT_APP_API_URL}/api/backup/device`, {
      method: 'GET',
      headers: getHeaders(true, false),
    }).then((res) => res.json());
    return devices.filter((device) => device.id);
  },
  async getAllBackups(mac: string): Promise<DeviceBackup[]> {
    const backups = await fetch(`${process.env.REACT_APP_API_URL}/api/backup/${mac}`, {
      method: 'GET',
      headers: getHeaders(true, false),
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
    const headers = getHeaders(true, false);
    await fetch(`${process.env.REACT_APP_API_URL}/api/backup/${backup.id}`, {
      method: 'DELETE',
      headers,
    });
    if (backup.fileId)
      fetch(`${process.env.REACT_APP_API_URL}/api/storage/bucket/${backup.bucket}/file/${backup.fileId}`, {
        method: 'DELETE',
        headers,
      });
  },
};

export default backupsService;
