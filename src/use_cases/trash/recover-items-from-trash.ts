import { SdkFactory } from 'app/core/factory/sdk';
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
import databaseService, { DatabaseCollection } from 'app/database/services/database.service';
import itemsListService from 'app/drive/services/items-list.service';
import { DriveItemData } from 'app/drive/types';

const failedItems: DriveItemData[] = [];

async function trackMove(response, type) {
  const user = localStorageService.getUser() as UserSettings;
  analyticsService.trackMoveItem(type, {
    file_id: response.item.id,
    email: user.email,
    platform: DevicePlatform.Web,
  });
  return response;
}

function handleError(err: unknown) {
  const castedError = errorService.castError(err);
  if (castedError.message.includes('same name')) {
    notificationsService.show({ text: 'Item with same name already exists', type: ToastType.Error });
  } else {
    if (castedError.status) {
      castedError.message = i18n.get(`tasks.move-folder.errors.${castedError.status}`);
    }
  }
}

function moveFile(
  item: DriveItemData,
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
  return storageClient.moveFile(payload)
    .then((response) => trackMove(response, 'file'))
    .catch((error) => {
      failedItems.push(item);
      handleError(error);
    });
}

function moveFolder(
  item: DriveItemData,
  folderId: number,
  destination: number
): Promise<StorageTypes.MoveFolderResponse> {
  const storageClient = SdkFactory.getInstance().createStorageClient();
  const payload: StorageTypes.MoveFolderPayload = {
    folderId: folderId,
    destinationFolderId: destination
  };

  return storageClient.moveFolder(payload)
    .then(response => trackMove(response, 'folder'))
    .catch((error) => {
      failedItems.push(item);
      handleError(error);
    });
}

async function afterMoving(itemsToRecover, destinationId) {
  itemsToRecover = itemsToRecover.filter((el) => !failedItems.includes(el));

  if (itemsToRecover.length > 0) {
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
      text: `Item${itemsToRecover.length > 1 ? 's' : ''} restored`,
    });
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const recoverItemsFromTrash = async (itemsToRecover: DriveItemData[], destinationId) => {
  itemsToRecover?.forEach((item) => {
    if (item.isFolder) {
      moveFolder(item, item.id, destinationId).catch(handleError);
    } else {
      moveFile(item, item.fileId, destinationId, item.bucket).catch(handleError);
    }
  });
  await afterMoving(itemsToRecover, destinationId);
  failedItems.splice(0);
};

export default recoverItemsFromTrash;
