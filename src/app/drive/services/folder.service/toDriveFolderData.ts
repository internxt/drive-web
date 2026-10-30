import { CreateFolderResponse } from '@internxt/sdk/dist/drive/storage/types';
import { DriveFolderData } from 'app/drive/types';

export const toDriveFolderData = (createdFolder: CreateFolderResponse, folderName: string): DriveFolderData => ({
  ...createdFolder,
  name: folderName,
  parent_id: createdFolder.parentId,
  user_id: createdFolder.userId,
  icon: null,
  iconId: null,
  icon_id: null,
  isFolder: true,
  color: null,
  encrypt_version: null,
  plain_name: createdFolder.plainName,
  deleted: false,
  createdAt: new Date(createdFolder.createdAt || '').toISOString(),
  updatedAt: new Date(createdFolder.updatedAt || '').toISOString(),
});
