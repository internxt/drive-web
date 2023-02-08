import { SdkFactory } from '../../app/core/factory/sdk';
import { storageActions } from '../../app/store/slices/storage';
import { store } from '../../app/store';
import notificationsService, { ToastType } from '../../app/notifications/services/notifications.service';
import { DriveItemData } from '../../app/drive/types';
import { AddItemsToTrashPayload } from '@internxt/sdk/dist/drive/trash/types';
import recoverItemsFromTrash from './recover-items-from-trash';
import { deleteDatabaseItems } from '../../app/drive/services/database.service';
import { TFunction } from 'i18next';
import errorService from '../../app/core/services/error.service';

const MAX_ITEMS_TO_DELETE = 50;

const moveItemsToTrash = async (itemsToTrash: DriveItemData[], t: TFunction): Promise<void> => {
  const items: Array<{ id: number | string; type: string }> = itemsToTrash.map((item) => {
    return {
      id: item.isFolder ? item.id : item.fileId,
      type: item.isFolder ? 'folder' : 'file',
    };
  });

  try {
    await deleteDatabaseItems(itemsToTrash);

    store.dispatch(storageActions.popItems({ updateRecents: true, items: itemsToTrash }));
    store.dispatch(storageActions.clearSelectedItems());

    const trashClient = await SdkFactory.getNewApiInstance().createTrashClient();

    for (let i = 0; i < items.length; i += MAX_ITEMS_TO_DELETE) {
      const itemsToDelete = items.slice(i, i + MAX_ITEMS_TO_DELETE);
      await trashClient.addItemsToTrash({ items: itemsToDelete } as AddItemsToTrashPayload);
    }

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
