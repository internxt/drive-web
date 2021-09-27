import { getHeaders } from '../lib/auth';
import { Backup, Device } from '../models/interfaces';
import { aes } from '@internxt/lib';

const backupsService = {
  getAllDevices(): Promise<Device[]> {
    return fetch(`${process.env.REACT_APP_API_URL}/api/backup/device`, {
      method: 'GET',
      headers: getHeaders(true, false),
    }).then((res) => res.json());
  },
  async getAllBackups(mac: string): Promise<Backup[]> {
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
};

export default backupsService;
