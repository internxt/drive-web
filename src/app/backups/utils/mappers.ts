import { aes } from '@internxt/lib';
import { DriveFolderData } from '../../drive/types';
import { envConfig } from 'app/core/services/env.service';

export const mapBackupFolder = (backupFolder: DriveFolderData) => {
  return {
    ...backupFolder,
    name:
      backupFolder.plainName ?? aes.decrypt(backupFolder.name, `${envConfig.crypto.secret2}-${backupFolder.bucket}`),
    isFolder: true,
  };
};
