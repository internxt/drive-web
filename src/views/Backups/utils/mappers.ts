import { aes } from '@internxt/lib';
import { DriveFolderData } from 'app/drive/types';
import { DriveFolderData as DriveFolderDataSDK } from '@internxt/sdk/dist/drive/storage/types';
import envService from 'services/env.service';

export const mapBackupFolder = (backupFolder: DriveFolderDataSDK): DriveFolderData => {
  return {
    ...backupFolder,
    name: backupFolder.plainName || backupFolder.plain_name,
    isFolder: true,
  };
};
