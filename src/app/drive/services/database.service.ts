import databaseService, {
  AvatarBlobData,
  DatabaseCollection,
  DriveItemBlobData,
  PreviewBlobData,
} from 'app/database/services/database.service';
import { LRUFilesCacheManager } from 'app/database/services/database.service/LRUFilesCacheManager';
import { LRUFilesPreviewCacheManager } from 'app/database/services/database.service/LRUFilesPreviewCacheManager';
import { LRUPhotosThumbnailsCacheManager } from 'app/database/services/database.service/LRUPhotosThumbnailsCacheManager';
import errorService from 'services/error.service';
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
  previewBlob,
  updatedAt,
}: {
  fileUuid: string;
  previewBlob: Blob;
  updatedAt: string;
}): Promise<void> => {
  const lruFilesPreviewCacheManager = await LRUFilesPreviewCacheManager.getInstance();
  lruFilesPreviewCacheManager
    .set(fileUuid, { preview: previewBlob, updatedAt }, previewBlob.size)
    .catch(errorService.reportError);
};

const getDatabasePhotoThumbnail = async ({ fileUuid }: { fileUuid: string }): Promise<PreviewBlobData | undefined> => {
  const lruPhotosThumbnailsCacheManager = await LRUPhotosThumbnailsCacheManager.getInstance();
  return lruPhotosThumbnailsCacheManager.get(fileUuid);
};

const updateDatabasePhotoThumbnail = async ({
  fileUuid,
  previewBlob,
  updatedAt,
}: {
  fileUuid: string;
  previewBlob: Blob;
  updatedAt: string;
}): Promise<void> => {
  const lruPhotosThumbnailsCacheManager = await LRUPhotosThumbnailsCacheManager.getInstance();
  await lruPhotosThumbnailsCacheManager.set(fileUuid, { preview: previewBlob, updatedAt }, previewBlob.size);
};

const getDatabaseFilePreviewData = async ({ fileUuid }: { fileUuid: string }): Promise<PreviewBlobData | undefined> => {
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
  lruFilesCacheManager
    .set(fileUuid, { uuid: fileUuid, parentId: folderId, source: sourceBlob, updatedAt }, sourceBlob.size)
    .catch(errorService.reportError);
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
    foldersInFolder.forEach(async (folder) => {
      const folderItems = await databaseService.get(DatabaseCollection.Levels, folder?.uuid);

      if (folderItems) {
        deleteDatabaseItems(folderItems as DriveItemData[]).catch((error) =>
          console.error('Error deleting cached folder items:', error),
        );
      }
    });
  }

  filesToRemove.forEach((item) => {
    lruFilesCacheManager
      ?.delete(item.uuid, item.size)
      .catch((error) => console.error('Error deleting cached file:', error));
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
  getDatabasePhotoThumbnail,
  getDatabaseProfileAvatar,
  getDatabaseWorkspaceAvatar,
  updateDatabaseFilePreviewData,
  updateDatabaseFileSourceData,
  updateDatabasePhotoThumbnail,
  updateDatabaseProfileAvatar,
  updateDatabaseWorkspaceAvatar,
};
