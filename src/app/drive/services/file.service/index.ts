import { DriveFileData, DriveFileMetadataPayload, DriveItemData } from '../../types';
import analyticsService from '../../../analytics/services/analytics.service';
import errorService from '../../../core/services/error.service';
import localStorageService from '../../../core/services/local-storage.service';
import { DevicePlatform } from '../../../core/types';
import i18n from '../../../i18n/services/i18n.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import uploadFile from './uploadFile';
import * as uuid from 'uuid';
import { createStorageClient } from '../../../../factory/modules';
import { StorageTypes } from '@internxt/sdk/dist/drive';

export function updateMetaData(fileId: string, metadata: DriveFileMetadataPayload, bucketId: string): Promise<void> {
  const storageClient = createStorageClient();
  const payload: StorageTypes.UpdateFilePayload = {
    fileId: fileId,
    metadata: metadata,
    bucketId: bucketId,
    destinationPath: uuid.v4()
  };

  return storageClient.updateFile(payload)
    .then(() => {
      const user = localStorageService.getUser() as UserSettings;
      analyticsService.trackFileRename({
        file_id: fileId,
        email: user.email,
        platform: DevicePlatform.Web,
      });
    });
}

export function deleteFile(fileData: DriveFileData): Promise<void> {
  const storageClient = createStorageClient();
  return storageClient.deleteFile({
    fileId: fileData.id,
    folderId: fileData.folderId
  })
    .then(() => {
      const user = localStorageService.getUser() as UserSettings;
      analyticsService.trackDeleteItem(fileData as DriveItemData, {
        email: user.email,
        platform: DevicePlatform.Web,
      });
    });
}

export async function moveFile(
  fileId: string, destination: number, bucketId: string
): Promise<StorageTypes.MoveFileResponse> {
  const storageClient = createStorageClient();
  const payload: StorageTypes.MoveFilePayload = {
    fileId: fileId,
    destination: destination,
    bucketId: bucketId,
    destinationPath: uuid.v4()
  };
  return storageClient.moveFile(payload)
    .then(response => {
      const user = localStorageService.getUser() as UserSettings;
      analyticsService.trackMoveItem('file', {
        file_id: response.item.id,
        email: user.email,
        platform: DevicePlatform.Web,
      });
      return response;
    })
    .catch(error => {
      const castedError = errorService.castError(error);
      if (castedError.status) {
        castedError.message = i18n.get(`tasks.move-file.errors.${castedError.status}`);
      }
      throw castedError;
    });
}

async function fetchRecents(limit: number): Promise<DriveFileData[]> {
  const storageClient = createStorageClient();
  return storageClient.getRecentFiles(limit);
}

const fileService = {
  updateMetaData,
  deleteFile,
  moveFile,
  fetchRecents,
  uploadFile,
};

export default fileService;
