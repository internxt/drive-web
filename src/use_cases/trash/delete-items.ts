import { storageActions } from '../../app/store/slices/storage';
import { store } from '../../app/store';
import notificationsService, { ToastType } from '../../app/notifications/services/notifications.service';
import { SdkFactory } from '../../app/core/factory/sdk';
import { DriveItemData } from '../../app/drive/types';
import { DeleteItemsPermanentlyPayload } from '@internxt/sdk/dist/drive/trash/types';
import { deleteDatabaseItems } from '../../app/drive/services/database.service';
import { t } from 'i18next';
import { Trash } from '@internxt/sdk/dist/drive';

const MAX_ITEMS_TO_DELETE = 20;
const MAX_CONCURRENT_REQUESTS = 2;

async function deleteItemsPermanently({
  items,
  maxItemsToDelete,
  maxConcurrentRequests,
  trashClient,
}: {
  items: { id: number | string; type: string }[];
  maxItemsToDelete: number;
  maxConcurrentRequests: number;
  trashClient: Trash;
}) {
  const promises: Promise<unknown>[] = [];

  for (let i = 0; i < items.length; i += maxItemsToDelete) {
    const itemsToDelete = items.slice(i, i + maxItemsToDelete);
    const promise = trashClient.deleteItemsPermanently({ items: itemsToDelete } as DeleteItemsPermanentlyPayload);
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
  const items: Array<{ id: number | string; type: string }> = itemsToDelete.map((item) => {
    return {
      id: item.id,
      type: item.isFolder ? 'folder' : 'file',
    };
  });

  const trashClient = await SdkFactory.getNewApiInstance().createTrashClient();

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
            item: itemsToDelete[0].isFolder === true ? t('general.folder') : t('general.file'),
          }),
  });
};

export default DeleteItems;
