import { SdkFactory } from 'app/core/factory/sdk';
import { StorageTypes } from '@internxt/sdk/dist/drive';
import analyticsService from 'app/analytics/services/analytics.service';
import errorService from 'app/core/services/error.service';
import localStorageService from 'app/core/services/local-storage.service';
import { DevicePlatform } from 'app/core/types';
import { get } from 'app/i18n/services/i18n.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import * as uuid from 'uuid';
import { store } from '../../app/store';
import { storageActions } from 'app/store/slices/storage';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import databaseService, { DatabaseCollection } from 'app/database/services/database.service';
import itemsListService from 'app/drive/services/items-list.service';
import { DriveItemData } from 'app/drive/types';
import { useTranslation } from 'react-i18next';
import { TFunction } from 'i18next';

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
      castedError.message = get(`tasks.move-folder.errors.${castedError.status}`);
    }
  }
}

function moveFile(
  item: DriveItemData,
  fileId: string,
  destination: number,
  bucketId: string,
  failedItems: DriveItemData[],
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
    .then((response) => trackMove(response, 'file'))
    .catch((error) => {
      failedItems.push(item);
      handleError(error);
    });
}

function moveFolder(
  item: DriveItemData,
  folderId: number,
  destination: number,
  failedItems: DriveItemData[],
): Promise<StorageTypes.MoveFolderResponse> {
  const storageClient = SdkFactory.getInstance().createStorageClient();
  const payload: StorageTypes.MoveFolderPayload = {
    folderId: folderId,
    destinationFolderId: destination,
  };
  return storageClient
    .moveFolder(payload)
    .then((response) => trackMove(response, 'folder'))
    .catch((error) => {
      failedItems.push(item);
      handleError(error);
    });
}

async function afterMoving(
  itemsToRecover: DriveItemData[],
  destinationId: number,
  failedItems: DriveItemData[],
  t: TFunction,
): Promise<void> {
  itemsToRecover = itemsToRecover.filter((el) => !failedItems.includes(el));

  if (itemsToRecover.length > 0) {
    const destinationLevelDatabaseContent = await databaseService.get(DatabaseCollection.Levels, destinationId);
    if (destinationLevelDatabaseContent) {
      databaseService.put(
        DatabaseCollection.Levels,
        destinationId,
        itemsListService.pushItems(itemsToRecover, destinationLevelDatabaseContent),
      );
    }
    store.dispatch(storageActions.popItemsToDelete(itemsToRecover));
    store.dispatch(storageActions.clearSelectedItems());

    const toastText = itemsToRecover[0].deleted
      ? t('notificationMessages.restoreItems', {
          itemsToRecover:
            itemsToRecover.length > 1
              ? t('general.files')
              : itemsToRecover[0].isFolder === true
              ? t('general.folder')
              : t('general.file'),
          s: itemsToRecover.length > 1 ? 's' : '',
        })
      : t('notificationMessages.itemsMovedToTrash', {
          item:
            itemsToRecover.length > 1
              ? t('general.files')
              : itemsToRecover[0].isFolder === true
              ? t('general.folder')
              : t('general.file'),
          s: itemsToRecover.length > 1 ? 's' : '',
        });
    notificationsService.show({
      type: ToastType.Success,
      text: toastText,
    });
  }

  if (failedItems.length > 0) {
    store.dispatch(storageActions.popItems({ updateRecents: true, items: failedItems }));
    store.dispatch(storageActions.clearSelectedItems());
  }
}

const recoverItemsFromTrash = async (
  itemsToRecover: DriveItemData[],
  destinationId: number,
  t: TFunction,
): Promise<void> => {
  const failedItems: DriveItemData[] = [];
  for (const item of itemsToRecover) {
    if (item.isFolder) {
      await moveFolder(item, item.id, destinationId, failedItems);
    } else {
      await moveFile(item, item.fileId, destinationId, item.bucket, failedItems);
    }
  }
  return afterMoving(itemsToRecover, destinationId, failedItems, t);
};

export default recoverItemsFromTrash;
