import { SdkFactory } from '../../app/core/factory/sdk';
import { storageActions } from '../../app/store/slices/storage';
import { store } from '../../app/store';
import notificationsService, { ToastType } from '../../app/notifications/services/notifications.service';
import { DriveItemData } from '../../app/drive/types';
import { AddItemsToTrashPayload } from '@internxt/sdk/dist/drive/trash/types';
import { Trash } from '@internxt/sdk/dist/drive';
import recoverItemsFromTrash from './recover-items-from-trash';
import { deleteDatabaseItems } from '../../app/drive/services/database.service';
import { t } from 'i18next';
import errorService from '../../app/core/services/error.service';

const MAX_ITEMS_TO_DELETE = 10;
const MAX_CONCURRENT_REQUESTS = 3;

async function sendItemsToTrashConcurrent({
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
    const promise = trashClient.addItemsToTrash({ items: itemsToDelete } as AddItemsToTrashPayload);
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

const moveItemsToTrash = async (itemsToTrash: DriveItemData[]): Promise<void> => {
  const items: Array<{ id: number | string; type: string }> = itemsToTrash.map((item) => {
    return {
      id: item.isFolder ? item.id : item.fileId,
      type: item.isFolder ? 'folder' : 'file',
    };
  });
  let movingItemsToastId;

  try {
    const trashClient = await SdkFactory.getNewApiInstance().createTrashClient();

    movingItemsToastId = notificationsService.show({
      type: ToastType.Loading,
      text: t('drive.movingToTrash'),
      duration: 100000,
      closable: false,
    });

    await sendItemsToTrashConcurrent({
      items,
      maxItemsToDelete: MAX_ITEMS_TO_DELETE,
      maxConcurrentRequests: MAX_CONCURRENT_REQUESTS,
      trashClient,
    });

    await deleteDatabaseItems(itemsToTrash);

    store.dispatch(storageActions.popItems({ updateRecents: true, items: itemsToTrash }));
    store.dispatch(storageActions.clearSelectedItems());

    notificationsService.dismiss(movingItemsToastId);

    const id = notificationsService.show({
      type: ToastType.Success,
      text: t('notificationMessages.itemsMovedToTrash', {
        item:
          itemsToTrash.length > 1
            ? t('general.files')
            : itemsToTrash[0].isFolder
            ? t('general.folder')
            : t('general.file'),
        s: itemsToTrash.length > 1 ? 'os' : itemsToTrash[0].isFolder ? 'a' : 'o',
      }),

      action: {
        text: t('actions.undo'),
        onClick: async () => {
          notificationsService.dismiss(id);
          if (itemsToTrash.length > 0) {
            const destinationId = itemsToTrash[0].isFolder ? itemsToTrash[0].parentId : itemsToTrash[0].folderId;
            store.dispatch(
              storageActions.pushItems({ updateRecents: true, items: itemsToTrash, folderIds: [destinationId] }),
            );

            store.dispatch(storageActions.clearSelectedItems());
            await recoverItemsFromTrash(itemsToTrash, destinationId, t);
          }
        },
      },
    });
  } catch (error) {
    notificationsService.dismiss(movingItemsToastId);
    notificationsService.show({
      text: t('error.errorMovingToTrash'),
      type: ToastType.Error,
    });

    errorService.reportError(error, {
      extra: {
        items,
      },
    });
  }
};

export default moveItemsToTrash;
