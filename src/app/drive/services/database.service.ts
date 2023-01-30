import databaseService, { DatabaseCollection } from '../../database/services/database.service';
import { LRUFilesCacheManager } from '../../database/services/database.service/LRUFilesCacheManager';
import { DriveFileData, DriveFolderData, DriveItemData } from '../types';

const updateDatabaseFilePrewiewData = async ({
  fileId,
  folderId,
  previewBlob,
}: {
  fileId: number;
  folderId: number;
  updatedAt: string;
  previewBlob: Blob;
}): Promise<void> => {
  // TODO: THIS WILL BE FINISHED IN THE TASK OF CACHE PREVIEW OF THE EPIC
  // const lruFilesCacheManager = await LRUFilesCacheManager.getInstance();
  // const folderBlobItem = await databaseService.get(DatabaseCollection.LevelsBlobs, fileId);
  // lruFilesCacheManager.set(
  //   fileId.toString(),
  //   {
  //     ...folderBlobItem,
  //     id: fileId,
  //     parentId: folderId,
  //     preview: previewBlob,
  //   },
  //   previewBlob.size,
  // );
};

const updateDatabaseFileSourceData = async ({
  fileId,
  folderId,
  updatedAt,
  sourceBlob,
}: {
  fileId: number;
  folderId: number;
  updatedAt: string;
  sourceBlob: Blob;
}): Promise<void> => {
  const lruFilesCacheManager = await LRUFilesCacheManager.getInstance();

  lruFilesCacheManager.set(
    fileId.toString(),
    {
      id: fileId,
      source: sourceBlob,
      updatedAt: updatedAt,
      parentId: folderId,
    },
    sourceBlob.size,
  );
};

const deleteDatabasePhotos = async (photosId: string[]): Promise<void> => {
  photosId.forEach(async (photoId) => await databaseService.delete(DatabaseCollection.Photos, photoId));
};

const deleteDatabaseItems = async (items: DriveItemData[]): Promise<void> => {
  const lruFilesCacheManager = await LRUFilesCacheManager.getInstance();

  const filesToRemove = [] as DriveFileData[];
  const foldersInFolder = items.filter((item) => {
    if (!(item as DriveFolderData)?.isFolder) {
      filesToRemove.push(item as DriveFileData);
      return false;
    }
    return true;
  });

  if (foldersInFolder.length) {
    await foldersInFolder.forEach(async (folder) => {
      const folderItems = await databaseService.get(DatabaseCollection.Levels, folder?.id as number);

      if (folderItems) {
        deleteDatabaseItems(folderItems as DriveItemData[]);
      }
    });
  }

  filesToRemove.forEach((item) => {
    lruFilesCacheManager.delete(item.id.toString(), item.size);
  });
};

export { updateDatabaseFilePrewiewData, updateDatabaseFileSourceData, deleteDatabasePhotos, deleteDatabaseItems };
