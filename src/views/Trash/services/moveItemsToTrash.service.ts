import storageThunks from 'app/store/slices/storage/storage.thunks';
import { t } from 'i18next';
import { SdkFactory } from 'app/core/factory/sdk';
import errorService from 'services/error.service';
import { deleteDatabaseItems } from 'app/drive/services/database.service';
import { DriveItemData } from 'app/drive/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { store } from 'app/store';
import { storageActions } from 'app/store/slices/storage';
import { processBatchConcurrently } from './batchProcessor.service';

const MAX_ITEMS_TO_DELETE = 10;
const MAX_CONCURRENT_REQUESTS = 3;

const isFolder = (item: DriveItemData) => item?.type === 'folder' || item?.isFolder;

const moveItemsToTrash = async (itemsToTrash: DriveItemData[], onSuccess?: () => void): Promise<void> => {
  const items: Array<{ uuid: string; type: 'file' | 'folder' }> = itemsToTrash.map((item) => {
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
    onSuccess?.();
    notificationsService.dismiss(movingItemsToastId);

    const isMultipleItems = itemsToTrash.length > 1;
    const firstItemIsFolder = isFolder(itemsToTrash[0]);

    let item: string;
    let suffix: string;

    if (isMultipleItems) {
      item = t('general.files');
      suffix = 'os';
    } else if (firstItemIsFolder) {
      item = t('general.folder');
      suffix = 'a';
    } else {
      item = t('general.file');
      suffix = 'o';
    }

    const id = notificationsService.show({
      type: ToastType.Success,
      text: t('notificationMessages.itemsMovedToTrash', {
        item,
        s: suffix,
      }),

      action: {
        text: t('actions.undo'),
        onClick: () => {
          notificationsService.dismiss(id);
          if (itemsToTrash.length > 0) {
            const destinationId = isFolder(itemsToTrash[0]) ? itemsToTrash[0].parentUuid : itemsToTrash[0].folderUuid;

            store.dispatch(
              storageActions.pushItems({ updateRecents: true, items: itemsToTrash, folderIds: [destinationId] }),
            );

            store.dispatch(storageActions.clearSelectedItems());
            store.dispatch(
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
