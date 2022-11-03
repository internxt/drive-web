import fileService from '../file.service';
import folderService from '../folder.service';
import { DriveFileData, DriveFolderData, DriveItemData } from '../../types';

export function moveItem(item: DriveItemData, destinationFolderId: number, bucketId: string): Promise<void> {
  return item.isFolder
    ? folderService.moveFolder((item as DriveFolderData).id, destinationFolderId).then()
    : fileService.moveFile((item as DriveFileData).fileId, destinationFolderId, bucketId).then();
}

const storageService = {
  moveItem,
};

export default storageService;
