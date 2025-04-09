import { aes } from '@internxt/lib';
import localStorageService from 'app/core/services/local-storage.service';
import { DriveFolderData } from 'app/drive/types';

export const decryptedBackupFolderName = (folder: DriveFolderData) => {
  const user = localStorageService.getUser();
  return {
    ...folder,
    name: folder.plainName ?? aes.decrypt(folder.name, user?.backupsBucket ?? ''),
    isFolder: true,
  };
};
