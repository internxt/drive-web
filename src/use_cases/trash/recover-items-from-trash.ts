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
import { storageActions } from 'app/store/slices/storage';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import databaseService, { DatabaseCollection } from 'app/database/services/database.service';
import itemsListService from 'app/drive/services/items-list.service';
//import { useHistory } from 'react-router-dom';
//import { fetchFolderContentThunk } from 'app/store/slices/storage/storage.thunks/fetchFolderContentThunk';
//import { uiActions } from 'app/store/slices/ui';
//import { Link, Redirect } from 'react-router-dom';
//import { Toast } from 'react-bootstrap';
//import { createMemoryHistory } from 'history';
//import { useSelector } from 'react-redux';
//import navigationService from 'app/core/services/navigation.service';
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
      if (castedError.message.includes('same name')) {

        notificationsService.show({ text: 'Item with same name already exists', type: ToastType.Error });
      } else {
        if (castedError.status) {
          castedError.message = i18n.get(`tasks.move-folder.errors.${castedError.status}`);
          throw castedError;
        }
      }
      throw error;
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

      if (castedError.message.includes('same name')) {

        notificationsService.show({ text: 'Item with same name already exists', type: ToastType.Error });
      } else {
        if (castedError.status) {
          castedError.message = i18n.get(`tasks.move-folder.errors.${castedError.status}`);

        }
        throw castedError;
      }



      throw err;
    });
}

async function afterMoving(itemsToRecover, destinationId, name?) {
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
      text: 'OpenFolder',
      to: '/app',
      onClick: () => {

        console.log(destinationId);
        console.log(itemsToRecover);
        setTimeout(() => store.dispatch(storageThunks.goToFolderThunk({ name: name ? name : itemsToRecover[0].parent, id: destinationId })),
          500);


        console.log('Open folder');
      },
    },
  });
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const RecoverItemsFromTrash = async (itemsToRecover, destinationId, name?) => {


  itemsToRecover.forEach((item) => {
    if (item.isFolder) {
      moveFolder(item.id, destinationId).then(() => { if (itemsToRecover[itemsToRecover.length - 1] === item) { afterMoving(itemsToRecover, destinationId, name); } }).catch((err) => { if (err) { return err; } });
    } else {
      moveFile(item.fileId, destinationId, item.bucket).then(() => { if (itemsToRecover[itemsToRecover.length - 1] === item) { afterMoving(itemsToRecover, destinationId, name); } }).catch((err) => { if (err) { return err; } });
    }
  });


};

export default RecoverItemsFromTrash;

