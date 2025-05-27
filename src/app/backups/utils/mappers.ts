import { aes } from '@internxt/lib';
import { DriveFolderData } from '../../drive/types';
import { DriveFolderData as DriveFolderDataSDK } from '@internxt/sdk/dist/drive/storage/types';

export const mapBackupFolder = (backupFolder: DriveFolderDataSDK): DriveFolderData => {
  return {
    ...backupFolder,
    name:
      backupFolder.plainName ??
      aes.decrypt(backupFolder.name, `${process.env.REACT_APP_CRYPTO_SECRET2}-${backupFolder.bucket}`),
    isFolder: true,
  };
};
