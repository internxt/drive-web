import storageThunks from 'app/store/slices/storage/storage.thunks';
import { t } from 'i18next';
import { SdkFactory } from '../../../core/factory/sdk';
import errorService from '../../../core/services/error.service';
import { deleteDatabaseItems } from '../../../drive/services/database.service';
import { DriveItemData } from '../../../drive/types';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import { store } from '../../../store';
import { storageActions } from '../../../store/slices/storage';
import { processBatchConcurrently } from './batch-processor';

const MAX_ITEMS_TO_DELETE = 10;
const MAX_CONCURRENT_REQUESTS = 3;

const isFolder = (item: DriveItemData) => item?.type === 'folder' || item?.isFolder;

const moveItemsToTrash = async (itemsToTrash: DriveItemData[], onSuccess?: () => void): Promise<void> => {
  const items: Array<{ uuid: string; type: 'file' | 'folder'; id: null }> = itemsToTrash.map((item) => {
    return {
      uuid: item.uuid,
      type: isFolder(item) ? 'folder' : 'file',
      id: null,
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

    await processBatchConcurrently({
      items,
      batchSize: MAX_ITEMS_TO_DELETE,
      maxConcurrentBatches: MAX_CONCURRENT_REQUESTS,
      processor: (batch) => trashClient.addItemsToTrash({ items: batch }),
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
