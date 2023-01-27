import databaseService, { DatabaseCollection } from '.';
import { DriveItemData, DriveFolderData, DriveFileData } from '../../../drive/types';

const deleteDatabasePhotos = async (photosId: string[]): Promise<void> => {
  photosId.forEach(async (photoId) => await databaseService.delete(DatabaseCollection.Photos, photoId));
};

const deleteDatabaseItemsFromFolder = async (
  folderId: number,
  items: (DriveFileData | DriveFolderData)[],
): Promise<void> => {
  const folderBlobItems = await databaseService.get(DatabaseCollection.LevelsBlobs, folderId);

  const foldersInFolder = items.filter((item) => (item as DriveFolderData)?.isFolder);
  if (foldersInFolder.length) {
    await foldersInFolder.forEach(async (folder) => {
      const folderItems = await databaseService.get(DatabaseCollection.Levels, folder.id);
      if (folderItems) {
        deleteDatabaseItemsFromFolder(folder.id, folderItems as unknown as DriveFileData[]);
      }
    });
  }

  const folderItemsFiltered = folderBlobItems?.length
    ? folderBlobItems?.filter((blobItem) => !items.some((file) => blobItem.id === file.id))
    : [];
  databaseService.put(DatabaseCollection.LevelsBlobs, folderId, folderItemsFiltered);
};

const deleteDatabaseItemsFromDifferentFolders = async (files: DriveItemData[]): Promise<void> => {
  const groupedFiles = files.reduce((acc, file) => {
    (acc[file.folderId] = acc[file.folderId] || []).push(file);
    return acc;
  }, {});

  const folderIds = Object.keys(groupedFiles);

  folderIds.forEach(async (folderId) => {
    if (!!folderId && folderId !== 'undefined') {
      const folderBlobItems = await databaseService.get(DatabaseCollection.LevelsBlobs, parseInt(folderId));

      const folderItemsFiltered = folderBlobItems?.length
        ? folderBlobItems?.filter((blobItem) => !groupedFiles[folderId].some((file) => blobItem.id === file.id))
        : [];
      databaseService.put(DatabaseCollection.LevelsBlobs, parseInt(folderId), folderItemsFiltered);
    }
  });
};

export { deleteDatabasePhotos, deleteDatabaseItemsFromFolder, deleteDatabaseItemsFromDifferentFolders };
