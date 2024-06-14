import fileService from '../file.service';
import folderService from '../folder.service';
import { DriveFileData, DriveFolderData, DriveItemData } from '../../types';

export function moveItem(item: DriveItemData, destinationFolderId: string): Promise<void> {
  return item.isFolder
    ? folderService.moveFolderByUuid((item as DriveFolderData).plain_name, destinationFolderId).then()
    : fileService.moveFileByUuid((item as DriveFileData).name, destinationFolderId).then();
}

const storageService = {
  moveItem,
};

export default storageService;
