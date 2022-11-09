import { SdkFactory } from '../../app/core/factory/sdk';
import { storageActions } from '../../app/store/slices/storage';
import { store } from '../../app/store';
import notificationsService, { ToastType } from '../../app/notifications/services/notifications.service';
import { DriveItemData } from '../../app/drive/types';
import { AddItemsToTrashPayload } from '@internxt/sdk/dist/drive/trash/types';
import recoverItemsFromTrash from './recover-items-from-trash';
import storageThunks from 'app/store/slices/storage/storage.thunks';

const moveItemsToTrash = async (itemsToTrash: DriveItemData[]): Promise<void> => {
  const items: Array<{ id: number | string; type: string }> = itemsToTrash.map((item) => {
    return {
      id: item.isFolder ? item.id : item.fileId,
      type: item.isFolder ? 'folder' : 'file',
    };
  });

  const trashClient = await SdkFactory.getNewApiInstance().createTrashClient();
  await trashClient.addItemsToTrash({ items } as AddItemsToTrashPayload);

  store.dispatch(storageActions.popItems({ updateRecents: true, items: itemsToTrash }));
  store.dispatch(storageActions.clearSelectedItems());

  const id = notificationsService.show({
    type: ToastType.Success,
    text: `${itemsToTrash.length > 1 ? itemsToTrash.length : ''} Item${itemsToTrash.length > 1 ? 's' : ''
      } moved to trash`,
    action: {
      text: 'Undo',
      onClick: async () => {
        if (itemsToTrash.length > 0) {
          const destinationId = itemsToTrash[0].isFolder ? itemsToTrash[0].parentId : itemsToTrash[0].folderId;
          await recoverItemsFromTrash(itemsToTrash, destinationId);
          setTimeout(() => {
            store.dispatch(storageActions.resetNamePath());
            store.dispatch(storageThunks.goToFolderThunk({ name: '', id: destinationId }));
          }, 500);
        }
        notificationsService.dismiss(id);
      },
    },
  });
};

export default moveItemsToTrash;
