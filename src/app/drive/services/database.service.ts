import databaseService, {
  AvatarBlobData,
  DatabaseCollection,
  DriveItemBlobData,
} from 'app/database/services/database.service';
import { LRUFilesCacheManager } from 'app/database/services/database.service/LRUFilesCacheManager';
import { LRUFilesPreviewCacheManager } from 'app/database/services/database.service/LRUFilesPreviewCacheManager';
import { DriveFileData, DriveFolderData, DriveItemData } from '../types';

const updateDatabaseProfileAvatar = async ({
  uuid,
  sourceURL,
  avatarBlob,
}: {
  uuid: string;
  sourceURL: string;
  avatarBlob: Blob;
}): Promise<void> =>
  databaseService.put(DatabaseCollection.Account_settings, 'profile_avatar', {
    srcURL: sourceURL,
    avatarBlob,
    uuid,
  });

const getDatabaseProfileAvatar = async (): Promise<AvatarBlobData | undefined> =>
  databaseService.get(DatabaseCollection.Account_settings, 'profile_avatar');

const deleteDatabaseProfileAvatar = async (): Promise<void> =>
  databaseService.delete(DatabaseCollection.Account_settings, 'profile_avatar');

const updateDatabaseWorkspaceAvatar = async ({
  uuid,
  sourceURL,
  avatarBlob,
}: {
  uuid: string;
  sourceURL: string;
  avatarBlob: Blob;
}): Promise<void> =>
  databaseService.put(DatabaseCollection.WorkspacesAvatarBlobs, uuid, {
    srcURL: sourceURL,
    avatarBlob,
    uuid,
  });

const getDatabaseWorkspaceAvatar = async (uuid: string): Promise<AvatarBlobData | undefined> =>
  databaseService.get(DatabaseCollection.WorkspacesAvatarBlobs, uuid);

const deleteDatabaseWorkspaceAvatar = async (uuid: string): Promise<void> =>
  databaseService.delete(DatabaseCollection.WorkspacesAvatarBlobs, uuid);

const updateDatabaseFilePreviewData = async ({
  fileUuid,
  folderId,
  previewBlob,
  updatedAt,
}: {
  fileUuid: string;
  folderId: number;
  previewBlob: Blob;
  updatedAt: string;
}): Promise<void> => {
  const lruFilesPreviewCacheManager = await LRUFilesPreviewCacheManager.getInstance();
  const fileData = await databaseService.get(DatabaseCollection.LevelsBlobs, fileUuid);

  lruFilesPreviewCacheManager?.set(
    fileUuid,
    {
      ...fileData,
      uuid: fileUuid,
      parentId: folderId,
      updatedAt: updatedAt,
      preview: previewBlob,
    },
    previewBlob.size,
  );
};

const getDatabaseFilePreviewData = async ({
  fileUuid,
}: {
  fileUuid: string;
}): Promise<DriveItemBlobData | undefined> => {
  const lruFilesPreviewCacheManager = await LRUFilesPreviewCacheManager.getInstance();

  return lruFilesPreviewCacheManager?.get(fileUuid);
};

const getDatabaseFileSourceData = async ({
  fileUuid,
}: {
  fileUuid: string;
}): Promise<DriveItemBlobData | undefined> => {
  const lruFilesCacheManager = await LRUFilesCacheManager.getInstance();
  return lruFilesCacheManager?.get(fileUuid);
};

const updateDatabaseFileSourceData = async ({
  fileUuid,
  folderId,
  updatedAt,
  sourceBlob,
}: {
  fileUuid: string;
  folderId: number;
  sourceBlob: Blob;
  updatedAt: string;
}): Promise<void> => {
  const lruFilesCacheManager = await LRUFilesCacheManager.getInstance();
  const fileData = await databaseService.get(DatabaseCollection.LevelsBlobs, fileUuid);

  lruFilesCacheManager?.set(
    fileUuid,
    {
      ...fileData,
      uuid: fileUuid,
      parentId: folderId,
      source: sourceBlob,
      updatedAt: updatedAt,
    },
    sourceBlob.size,
  );
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
      const folderItems = await databaseService.get(DatabaseCollection.Levels, folder?.uuid);

      if (folderItems) {
        deleteDatabaseItems(folderItems as DriveItemData[]);
      }
    });
  }

  filesToRemove.forEach((item) => {
    lruFilesCacheManager?.delete(item.uuid, item.size);
  });
};

const canFileBeCached = (file: DriveFileData): boolean => {
  return file.size < 50 * 1024 * 1024;
};

export {
  canFileBeCached,
  deleteDatabaseItems,
  deleteDatabaseProfileAvatar,
  deleteDatabaseWorkspaceAvatar,
  getDatabaseFilePreviewData,
  getDatabaseFileSourceData,
  getDatabaseProfileAvatar,
  getDatabaseWorkspaceAvatar,
  updateDatabaseFilePreviewData,
  updateDatabaseFileSourceData,
  updateDatabaseProfileAvatar,
  updateDatabaseWorkspaceAvatar,
};
