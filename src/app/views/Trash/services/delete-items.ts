import { Trash } from '@internxt/sdk/dist/drive';
import { DeleteItemsPermanentlyByUUIDPayload } from '@internxt/sdk/dist/drive/trash/types';
import { t } from 'i18next';
import { SdkFactory } from '../../../core/factory/sdk';
import errorService from '../../../core/services/error.service';
import { deleteDatabaseItems } from '../../../drive/services/database.service';
import { DriveItemData } from '../../../drive/types';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import { store } from '../../../store';
import { storageActions } from '../../../store/slices/storage';

const MAX_ITEMS_TO_DELETE = 20;
const MAX_CONCURRENT_REQUESTS = 2;

async function deleteItemsPermanently({
  items,
  maxItemsToDelete,
  maxConcurrentRequests,
  trashClient,
}: {
  items: { uuid: string; type: string }[];
  maxItemsToDelete: number;
  maxConcurrentRequests: number;
  trashClient: Trash;
}) {
  const promises: Promise<unknown>[] = [];

  for (let i = 0; i < items.length; i += maxItemsToDelete) {
    const itemsToDelete = items.slice(i, i + maxItemsToDelete);
    const promise = trashClient.deleteItemsPermanentlyByUUID({
      items: itemsToDelete,
    } as DeleteItemsPermanentlyByUUIDPayload);
    promises.push(promise);

    if (promises.length === maxConcurrentRequests) {
      await Promise.all(promises);
      promises.length = 0;
    }
  }

  if (promises.length > 0) {
    await Promise.all(promises);
  }
}

const DeleteItems = async (itemsToDelete: DriveItemData[]): Promise<void> => {
  const items: Array<{ uuid: string; type: string }> = itemsToDelete.map((item) => {
    return {
      uuid: item.uuid,
      type: item.isFolder ? 'folder' : 'file',
    };
  });

  try {
    const trashClient = SdkFactory.getNewApiInstance().createTrashClient();
    await deleteItemsPermanently({
      items,
      maxItemsToDelete: MAX_ITEMS_TO_DELETE,
      maxConcurrentRequests: MAX_CONCURRENT_REQUESTS,
      trashClient,
    });

    await deleteDatabaseItems(itemsToDelete);

    store.dispatch(storageActions.popItemsToDelete(itemsToDelete));

    let foldersRemovedNumber = 0;
    let filesRemovedNumber = 0;

    itemsToDelete.forEach((item) => {
      if (item.isFolder) {
        foldersRemovedNumber = foldersRemovedNumber + 1;
      } else {
        filesRemovedNumber = filesRemovedNumber + 1;
      }
    });
    store.dispatch(storageActions.addFoldersOnTrashLength(-foldersRemovedNumber));
    store.dispatch(storageActions.addFilesOnTrashLength(-filesRemovedNumber));
    store.dispatch(storageActions.clearSelectedItems());

    notificationsService.show({
      type: ToastType.Success,
      text:
        items.length > 1
          ? t('notificationMessages.itemsDeleted')
          : t('notificationMessages.itemDeleted', {
              item: itemsToDelete[0].isFolder ? t('general.folder') : t('general.file'),
            }),
    });
  } catch (error) {
    notificationsService.show({
      text: t('error.errorDeletingFromTrash'),
      type: ToastType.Error,
    });
    errorService.reportError(error, {
      extra: {
        items,
      },
    });
  }
};

export default DeleteItems;
