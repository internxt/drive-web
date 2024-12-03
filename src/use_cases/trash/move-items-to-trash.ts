import { Trash } from '@internxt/sdk/dist/drive';
import { AddItemsToTrashPayload } from '@internxt/sdk/dist/drive/trash/types';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import { t } from 'i18next';
import { SdkFactory } from '../../app/core/factory/sdk';
import errorService from '../../app/core/services/error.service';
import { deleteDatabaseItems } from '../../app/drive/services/database.service';
import { DriveItemData } from '../../app/drive/types';
import notificationsService, { ToastType } from '../../app/notifications/services/notifications.service';
import { store } from '../../app/store';
import { storageActions } from '../../app/store/slices/storage';

const MAX_ITEMS_TO_DELETE = 10;
const MAX_CONCURRENT_REQUESTS = 3;

async function sendItemsToTrashConcurrent({
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

const isFolder = (item: DriveItemData) => item?.type === 'folder' || item?.isFolder;

const moveItemsToTrash = async (itemsToTrash: DriveItemData[], onSuccess?: () => void): Promise<void> => {
  const items: Array<{ uuid: string; type: string }> = itemsToTrash.map((item) => {
    return {
      uuid: item.uuid,
      type: isFolder(item) ? 'folder' : 'file',
    };
  });
  let movingItemsToastId;

  try {
    const trashClient = SdkFactory.getNewApiInstance().createTrashClient();

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
    onSuccess && onSuccess();
    notificationsService.dismiss(movingItemsToastId);

    const id = notificationsService.show({
      type: ToastType.Success,
      text: t('notificationMessages.itemsMovedToTrash', {
        item:
          itemsToTrash.length > 1
            ? t('general.files')
            : isFolder(itemsToTrash[0])
              ? t('general.folder')
              : t('general.file'),
        s: itemsToTrash.length > 1 ? 'os' : isFolder(itemsToTrash[0]) ? 'a' : 'o',
      }),

      action: {
        text: t('actions.undo'),
        onClick: async () => {
          notificationsService.dismiss(id);
          if (itemsToTrash.length > 0) {
            const destinationId = isFolder(itemsToTrash[0]) ? itemsToTrash[0].parentUuid : itemsToTrash[0].folderUuid;

            store.dispatch(
              storageActions.pushItems({ updateRecents: true, items: itemsToTrash, folderIds: [destinationId] }),
            );

            store.dispatch(storageActions.clearSelectedItems());
            await store.dispatch(
              storageThunks.moveItemsThunk({
                items: itemsToTrash,
                destinationFolderId: destinationId,
              }),
            );
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
