export interface Device {
  id: number;
  name: string;
  mac: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
  size: number;
  platform: string | null;
}

export interface DeviceBackup {
  id: number;
  path: string;
  name: string;
  fileId?: string;
  deviceId: number;
  userId: number;
  interval: number;
  size?: number;
  bucket: string;
  createdAt: string;
  updatedAt: string;
  encrypt_version: string;
  hash?: string;
  enabled: boolean;
  lastBackupAt?: string;
}
