import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import { DriveFolderData, DriveItemData } from '../../types';
import fileService from '../file.service';
import folderService from '../folder.service';

export function moveItem(item: DriveItemData, destinationFolderId: string, newName?: string): Promise<void> {
  return item.isFolder
    ? folderService.moveFolderByUuid((item as DriveFolderData).uuid, destinationFolderId, newName).then()
    : fileService.moveFileByUuid((item as DriveFileData).uuid, destinationFolderId, newName).then();
}

const storageService = {
  moveItem,
};

export default storageService;
