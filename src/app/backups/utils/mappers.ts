import { aes } from '@internxt/lib';
import { DriveFolderData } from '../../drive/types';
import { DriveFolderData as DriveFolderDataSDK } from '@internxt/sdk/dist/drive/storage/types';
import envService from 'app/core/services/env.service';

export const mapBackupFolder = (backupFolder: DriveFolderDataSDK): DriveFolderData => {
  return {
    ...backupFolder,
    name:
      backupFolder.plainName ??
      aes.decrypt(backupFolder.name, `${envService.getVaribale('secret2')}-${backupFolder.bucket}`),
    isFolder: true,
  };
};
