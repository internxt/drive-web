import { DriveFileData, DriveFileMetadataPayload, DriveItemData } from '../../types';
import analyticsService from '../../../analytics/services/analytics.service';
import errorService from '../../../core/services/error.service';
import localStorageService from '../../../core/services/local-storage.service';
import { DevicePlatform } from '../../../core/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import uploadFile from './uploadFile';
import * as uuid from 'uuid';
import { StorageTypes } from '@internxt/sdk/dist/drive';
import { SdkFactory } from '../../../core/factory/sdk';
import { useTranslation } from 'react-i18next';

export function updateMetaData(fileId: string, metadata: DriveFileMetadataPayload, bucketId: string): Promise<void> {
  const storageClient = SdkFactory.getInstance().createStorageClient();
  const payload: StorageTypes.UpdateFilePayload = {
    fileId: fileId,
    metadata: metadata,
    bucketId: bucketId,
    destinationPath: uuid.v4(),
  };

  return storageClient.updateFile(payload).then(() => {
    const user = localStorageService.getUser() as UserSettings;
    analyticsService.trackFileRename({
      file_id: fileId,
      email: user.email,
      platform: DevicePlatform.Web,
    });
  });
}

export async function moveFile(
  fileId: string,
  destination: number,
  bucketId: string,
): Promise<StorageTypes.MoveFileResponse> {
  const { t } = useTranslation();
  const storageClient = SdkFactory.getInstance().createStorageClient();
  const payload: StorageTypes.MoveFilePayload = {
    fileId: fileId,
    destination: destination,
    bucketId: bucketId,
    destinationPath: uuid.v4(),
  };
  return storageClient
    .moveFile(payload)
    .then((response) => {
      const user = localStorageService.getUser() as UserSettings;
      analyticsService.trackMoveItem('file', {
        file_id: response.item.id,
        email: user.email,
        platform: DevicePlatform.Web,
      });
      return response;
    })
    .catch((error) => {
      const castedError = errorService.castError(error);
      if (castedError.status) {
        castedError.message = t(`tasks.move-file.errors.${castedError.status}`);
      }
      throw castedError;
    });
}

export function deleteFile(fileData: DriveFileData): Promise<void> {
  const storageClient = SdkFactory.getInstance().createStorageClient();

  return storageClient.deleteFile({ fileId: fileData.id, folderId: fileData.folderId }).then(() => {
    const user = localStorageService.getUser() as UserSettings;
    analyticsService.trackDeleteItem(fileData as DriveItemData, {
      email: user.email,
      platform: DevicePlatform.Web,
    });
  });
}

async function fetchRecents(limit: number): Promise<DriveFileData[]> {
  const storageClient = SdkFactory.getInstance().createStorageClient();
  return storageClient.getRecentFiles(limit);
}

async function fetchDeleted(): Promise<DriveFileData[]> {
  const trashClient = SdkFactory.getNewApiInstance().createTrashClient();

  const trashRequest = trashClient.getTrash();

  return trashRequest[0].then((response) => {
    const { files } = response;
    return files;
  });
}

const fileService = {
  updateMetaData,
  moveFile,
  fetchRecents,
  uploadFile,
  fetchDeleted,
};

export default fileService;
