import { DeleteItemsPermanentlyByUUIDPayload } from '@internxt/sdk/dist/drive/trash/types';
import { t } from 'i18next';
import { SdkFactory } from 'app/core/factory/sdk';
import errorService from 'app/core/services/error.service';
import { deleteDatabaseItems } from 'app/drive/services/database.service';
import { DriveItemData } from 'app/drive/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { store } from 'app/store';
import { storageActions } from 'app/store/slices/storage';
import { processBatchConcurrently } from './batchProcessor.service';

const MAX_ITEMS_TO_DELETE = 20;
const MAX_CONCURRENT_REQUESTS = 2;

const deleteItems = async (itemsToDelete: DriveItemData[]): Promise<void> => {
  const items: Array<{ uuid: string; type: string }> = itemsToDelete.map((item) => {
    return {
      uuid: item.uuid,
      type: item.isFolder ? 'folder' : 'file',
    };
  });

  try {
    const trashClient = SdkFactory.getNewApiInstance().createTrashClient();
    await processBatchConcurrently({
      items,
      batchSize: MAX_ITEMS_TO_DELETE,
      maxConcurrentBatches: MAX_CONCURRENT_REQUESTS,
      processor: (batch) =>
        trashClient.deleteItemsPermanentlyByUUID({
          items: batch,
        } as DeleteItemsPermanentlyByUUIDPayload),
    });

    await deleteDatabaseItems(itemsToDelete);

    store.dispatch(storageActions.popItemsToDelete(itemsToDelete));

    const { foldersRemovedNumber, filesRemovedNumber } = itemsToDelete.reduce(
      (acc, item) => {
        if (item.isFolder) {
          acc.foldersRemovedNumber++;
        } else {
          acc.filesRemovedNumber++;
        }
        return acc;
      },
      { foldersRemovedNumber: 0, filesRemovedNumber: 0 },
    );
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

export default deleteItems;
