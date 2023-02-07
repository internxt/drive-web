import databaseService, {
  AvatarBlobData,
  DatabaseCollection,
  DriveItemBlobData,
} from '../../database/services/database.service';
import { LRUFilesCacheManager } from '../../database/services/database.service/LRUFilesCacheManager';
import { LRUFilesPreviewCacheManager } from '../../database/services/database.service/LRUFilesPreviewCacheManager';
import { DriveFileData, DriveFolderData, DriveItemData } from '../types';

const updateDatabaseProfileAvatar = async ({
  uuid,
  sourceURL,
  avatarBlob,
}: {
  uuid: string;
  sourceURL: string;
  avatarBlob: Blob;
}): Promise<void> => {
  databaseService.put(DatabaseCollection.Account_settings, 'profile_avatar', {
    srcURL: sourceURL,
    avatarBlob,
    uuid,
  });
};

const getDatabaseProfileAvatar = async (): Promise<AvatarBlobData | undefined> =>
  databaseService.get(DatabaseCollection.Account_settings, 'profile_avatar');

const deleteDatabaseProfileAvatar = async (): Promise<void> => {
  databaseService.delete(DatabaseCollection.Account_settings, 'profile_avatar');
};

const updateDatabaseFilePrewiewData = async ({
  fileId,
  folderId,
  previewBlob,
  updatedAt,
}: {
  fileId: number;
  folderId: number;
  previewBlob: Blob;
  updatedAt: string;
}): Promise<void> => {
  const lruFilesPreviewCacheManager = await LRUFilesPreviewCacheManager.getInstance();
  const fileData = await databaseService.get(DatabaseCollection.LevelsBlobs, fileId);

  lruFilesPreviewCacheManager.set(
    fileId.toString(),
    {
      ...fileData,
      id: fileId,
      parentId: folderId,
      updatedAt: updatedAt,
      preview: previewBlob,
    },
    previewBlob.size,
  );
};

const getDatabaseFilePrewiewData = async ({ fileId }: { fileId: number }): Promise<DriveItemBlobData | undefined> => {
  const lruFilesPreviewCacheManager = await LRUFilesPreviewCacheManager.getInstance();

  return lruFilesPreviewCacheManager.get(fileId.toString());
};

const getDatabaseFileSourceData = async ({ fileId }: { fileId: number }): Promise<DriveItemBlobData | undefined> => {
  const lruFilesCacheManager = await LRUFilesCacheManager.getInstance();
  return lruFilesCacheManager.get(fileId.toString());
};

const updateDatabaseFileSourceData = async ({
  fileId,
  folderId,
  updatedAt,
  sourceBlob,
}: {
  fileId: number;
  folderId: number;
  sourceBlob: Blob;
  updatedAt: string;
}): Promise<void> => {
  const lruFilesCacheManager = await LRUFilesCacheManager.getInstance();
  const fileData = await databaseService.get(DatabaseCollection.LevelsBlobs, fileId);

  lruFilesCacheManager.set(
    fileId.toString(),
    {
      ...fileData,
      id: fileId,
      parentId: folderId,
      source: sourceBlob,
      updatedAt: updatedAt,
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

export {
  getDatabaseProfileAvatar,
  updateDatabaseProfileAvatar,
  deleteDatabaseProfileAvatar,
  getDatabaseFilePrewiewData,
  updateDatabaseFilePrewiewData,
  getDatabaseFileSourceData,
  updateDatabaseFileSourceData,
  deleteDatabasePhotos,
  deleteDatabaseItems,
};
