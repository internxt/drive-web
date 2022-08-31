import { SdkFactory } from 'app/core/factory/sdk';
//import { storageActions } from 'app/store/slices/storage';
//import { store } from 'app/store';
//import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { StorageTypes } from '@internxt/sdk/dist/drive';
import analyticsService from 'app/analytics/services/analytics.service';
import errorService from 'app/core/services/error.service';
import localStorageService from 'app/core/services/local-storage.service';
import {DevicePlatform} from 'app/core/types';
import i18n from 'app/i18n/services/i18n.service';
import {UserSettings} from '@internxt/sdk/dist/shared/types/userSettings';
import * as uuid from 'uuid';

export async function moveFile(
  fileId: string,
  destination: number,
  bucketId: string,
): Promise<StorageTypes.MoveFileResponse> {
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
        castedError.message = i18n.get(`tasks.move-file.errors.${castedError.status}`);
      }
      throw castedError;
    });
}

export async function moveFolder(
  folderId: number, destination: number
): Promise<StorageTypes.MoveFolderResponse> {
  const storageClient = SdkFactory.getInstance().createStorageClient();
  const payload: StorageTypes.MoveFolderPayload = {
    folderId: folderId,
    destinationFolderId: destination
  };

  return storageClient.moveFolder(payload)
    .then(response => {
      const user = localStorageService.getUser() as UserSettings;
      analyticsService.trackMoveItem('folder', {
        file_id: response.item.id,
        email: user.email,
        platform: DevicePlatform.Web,
      });
      return response;
    })
    .catch((err) => {
      const castedError = errorService.castError(err);
      if (castedError.status) {
        castedError.message = i18n.get(`tasks.move-folder.errors.${castedError.status}`);
      }
      throw castedError;
    });
}


const RecoverItemsFromTrash = async (itemsToRecover, destinationId) => {
  itemsToRecover.foreach((item) => {
   if(item.isFolder){
    moveFolder(item.folderId, destinationId);
   }else{
    moveFile(item.fileId, destinationId, item.bucketId);
   }
  });
  
};

export default RecoverItemsFromTrash;

