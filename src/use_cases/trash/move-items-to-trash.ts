import { SdkFactory } from '../../app/core/factory/sdk';
import { storageActions } from '../../app/store/slices/storage';
import { store } from '../../app/store';
import notificationsService, { ToastType } from '../../app/notifications/services/notifications.service';
import { DriveItemData } from '../../app/drive/types';
import { AddItemsToTrashPayload } from '@internxt/sdk/dist/drive/trash/types';
import recoverItemsFromTrash from './recover-items-from-trash';
import i18n from 'app/i18n/services/i18n.service';
import { deleteDatabaseItems } from '../../app/drive/services/database.service';

const moveItemsToTrash = async (itemsToTrash: DriveItemData[]): Promise<void> => {
  const items: Array<{ id: number | string; type: string }> = itemsToTrash.map((item) => {
    return {
      id: item.isFolder ? item.id : item.fileId,
      type: item.isFolder ? 'folder' : 'file',
    };
  });

  await deleteDatabaseItems(itemsToTrash);

  store.dispatch(storageActions.popItems({ updateRecents: true, items: itemsToTrash }));
  store.dispatch(storageActions.clearSelectedItems());

  const trashClient = await SdkFactory.getNewApiInstance().createTrashClient();
  await trashClient.addItemsToTrash({ items } as AddItemsToTrashPayload);

  const id = notificationsService.show({
    type: ToastType.Success,
    text: i18n.get('notificationMessages.itemsMovedToTrash', {
      item:
        itemsToTrash.length > 1
          ? 'Archivos'
          : itemsToTrash.map((item) => {
              return item.type === 'folder' ? 'Folder' : 'File';
            }),
    }),

    action: {
      text: i18n.get('actions.undo'),
      onClick: async () => {
        notificationsService.dismiss(id);
        if (itemsToTrash.length > 0) {
          const destinationId = itemsToTrash[0].isFolder ? itemsToTrash[0].parentId : itemsToTrash[0].folderId;
          store.dispatch(
            storageActions.pushItems({ updateRecents: true, items: itemsToTrash, folderIds: [destinationId] }),
          );

          store.dispatch(storageActions.clearSelectedItems());
          await recoverItemsFromTrash(itemsToTrash, destinationId);
        }
      },
    },
  });
};

export default moveItemsToTrash;
