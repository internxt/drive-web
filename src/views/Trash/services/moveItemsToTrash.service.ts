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

const BATCH_SIZE = 10;
const MAX_CONCURRENT_BATCHES = 3;

const isFolder = (item: DriveItemData) => item?.type === 'folder' || item?.isFolder;

const groupByOriginalFolder = (items: DriveItemData[]) => {
  const itemsByFolder = new Map<string, DriveItemData[]>();
  for (const item of items) {
    const folderUuid = isFolder(item) ? item.parentUuid : item.folderUuid;
    itemsByFolder.set(folderUuid, [...(itemsByFolder.get(folderUuid) ?? []), item]);
  }
  return itemsByFolder;
};

/**
 * Moves the items back to the folders they were trashed from, in batches as when they were trashed. A failed batch
 * doesn't stop the others.
 */
const restoreToOriginalFolders = async (items: DriveItemData[]): Promise<boolean> => {
  let isEverythingRestored = true;

  await processBatchConcurrently({
    items,
    batchSize: BATCH_SIZE,
    maxConcurrentBatches: MAX_CONCURRENT_BATCHES,
    processor: async (batch) => {
      const results = await Promise.allSettled(
        [...groupByOriginalFolder(batch)].map(([destinationFolderId, folderItems]) =>
          store.dispatch(storageThunks.moveItemsThunk({ items: folderItems, destinationFolderId })).unwrap(),
        ),
      );
      if (results.some(({ status }) => status === 'rejected')) isEverythingRestored = false;
    },
  });

  return isEverythingRestored;
};

const refetchFavoritesIfNeeded = (items: DriveItemData[]) => {
  if (items.some(isFolder) && store.getState().storage.favorites.length > 0) {
    store.dispatch(storageActions.resetFavoritesPagination());
    store.dispatch(storageThunks.fetchFavoritesThunk());
  }
};

const moveItemsToTrash = async (
  itemsToTrash: DriveItemData[],
  onSuccess?: () => void,
  onUndo?: (isEverythingRestored: boolean) => void,
): Promise<void> => {
  const items: Array<{ uuid: string; type: 'file' | 'folder' }> = itemsToTrash.map((item) => {
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

    await processBatchConcurrently({
      items,
      batchSize: BATCH_SIZE,
      maxConcurrentBatches: MAX_CONCURRENT_BATCHES,
      processor: (batch) => trashClient.addItemsToTrash({ items: batch }),
    });

    await deleteDatabaseItems(itemsToTrash);

    store.dispatch(storageActions.popItems({ updateRecents: true, items: itemsToTrash }));
    store.dispatch(storageActions.clearSelectedItems());
    refetchFavoritesIfNeeded(itemsToTrash);
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

    const undoMoveToTrash = async () => {
      for (const [destinationId, items] of groupByOriginalFolder(itemsToTrash)) {
        store.dispatch(storageActions.pushItems({ updateRecents: true, items, folderIds: [destinationId] }));
      }
      store.dispatch(storageActions.clearSelectedItems());
      refetchFavoritesIfNeeded(itemsToTrash);

      const isEverythingRestored = await restoreToOriginalFolders(itemsToTrash);
      onUndo?.(isEverythingRestored);
    };

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
          void undoMoveToTrash();
        },
      },
    });
  } catch (error) {
    const castedError = errorService.castError(error);
    notificationsService.dismiss(movingItemsToastId);
    notificationsService.show({
      text: t('error.errorMovingToTrash'),
      type: ToastType.Error,
      requestId: castedError.requestId,
    });

    errorService.reportError(error);
  }
};

export default moveItemsToTrash;
