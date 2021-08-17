import fileService from '../file.service';
import folderService from '../folder.service';
import upload from './storage-upload.service';
import name from './storage-name.service';
import { DriveFileData, DriveFolderData, DriveItemData } from '../../models/interfaces';

export function deleteItems(items: DriveItemData[], isTeam: boolean): Promise<any> {
  const promises: Promise<any>[] = [];

  for (const item of items) {
    promises.push((item.isFolder ?
      folderService.deleteFolder(item as DriveFolderData, isTeam) :
      fileService.deleteFile(item as DriveFileData, isTeam)
    ));
  }

  return Promise.all(promises);
}

export function moveItem(item: DriveItemData, destinationFolderId: number): Promise<void> {
  return (item.isFolder ?
    folderService.moveFolder({ folderId: item.id, destination: destinationFolderId }) :
    fileService.moveFile({ fileId: item.fileId, destination: destinationFolderId })
  );
}

const storageService = {
  deleteItems,
  moveItem,
  upload,
  name
};

export default storageService;