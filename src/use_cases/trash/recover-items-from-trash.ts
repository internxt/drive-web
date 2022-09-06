import { SdkFactory } from 'app/core/factory/sdk';
//import { storageActions } from 'app/store/slices/storage';
//import { store } from 'app/store';
//import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { StorageTypes } from '@internxt/sdk/dist/drive';
import analyticsService from 'app/analytics/services/analytics.service';
import errorService from 'app/core/services/error.service';
import localStorageService from 'app/core/services/local-storage.service';
import { DevicePlatform } from 'app/core/types';
import i18n from 'app/i18n/services/i18n.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import * as uuid from 'uuid';
import { store } from '../../app/store';
import { storageActions, storageSelectors } from 'app/store/slices/storage';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import databaseService, { DatabaseCollection } from 'app/database/services/database.service';
import itemsListService from 'app/drive/services/items-list.service';
import { fetchFolderContentThunk } from 'app/store/slices/storage/storage.thunks/fetchFolderContentThunk';
import { uiActions } from 'app/store/slices/ui';
//import { DriveItemData } from 'app/drive/types';

async function moveFile(
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

async function moveFolder(
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


// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const RecoverItemsFromTrash = async (itemsToRecover, destinationId) => {

  itemsToRecover.forEach((item) => {
    if (item.isFolder) {
      moveFolder(item.id, destinationId);
    } else {
      moveFile(item.fileId, destinationId, item.bucket);
    }
  });

  //store.dispatch(storageActions.pushItems({ updateRecents: true, folderIds: [destinationId], items: itemsToRecover }));
  // Updates destination folder content in local database
  const destinationLevelDatabaseContent = await databaseService.get(
    DatabaseCollection.Levels,
    destinationId,
  );
  if (destinationLevelDatabaseContent) {
    databaseService.put(
      DatabaseCollection.Levels,
      destinationId,
      itemsListService.pushItems(itemsToRecover, destinationLevelDatabaseContent),
    );
  }
  store.dispatch(storageActions.popItemsToDelete(itemsToRecover));
  store.dispatch(storageActions.clearSelectedItems());


  notificationsService.show({
    type: ToastType.Success,
    text: `Restored ${itemsToRecover.length > 1 ? itemsToRecover.length : ''} Item${itemsToRecover.length > 1 ? 's' : ''} ${itemsToRecover.length == 1 ? '"' + itemsToRecover[0].name + '"' : ''}`,
    action: {
      text: 'Open folder',
      onClick: () => {
        console.log(destinationId);
        console.log(itemsToRecover);
        store.dispatch(storageThunks.goToFolderThunk({ name: itemsToRecover[0].name, id: destinationId }));
        //store.dispatch(fetchFolderContentThunk(destinationId)).unwrap();


        /*store.dispatch(storageActions.clearSelectedItems());

        store.dispatch(fetchFolderContentThunk(destinationId)).unwrap();

        store.dispatch(storageActions.pushNamePath(destinationId));

        store.dispatch(uiActions.setFileInfoItem(null));
        store.dispatch(uiActions.setIsDriveItemInfoMenuOpen(false));*/
        console.log('Open folder');
      },
    },
  });
};

export default RecoverItemsFromTrash;

