import { aes } from '@internxt/lib';
import { DriveFolderData } from '../../drive/types';

export const mapBackupFolder = (backupFolder: DriveFolderData) => {
  return {
    ...backupFolder,
    name:
      backupFolder.plainName ??
      aes.decrypt(backupFolder.name, `${process.env.REACT_APP_CRYPTO_SECRET2}-${backupFolder.bucket}`),
    isFolder: true,
  };
};
