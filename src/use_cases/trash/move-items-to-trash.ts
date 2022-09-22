import { SdkFactory } from '../../app/core/factory/sdk';
import { storageActions } from '../../app/store/slices/storage';
import { store } from '../../app/store';
import notificationsService, { ToastType } from '../../app/notifications/services/notifications.service';
import { DriveItemData } from '../../app/drive/types';
import { AddItemsToTrashPayload } from '@internxt/sdk/dist/drive/trash/types';
import RecoverItemsFromTrash from './recover-items-from-trash';

const MoveItemsToTrash = async (itemsToTrash: DriveItemData[]): Promise<void> => {
  const items: Array<{ id: number | string; type: string }> = itemsToTrash.map((item) => {
    return {
      id: item.isFolder ? item.id : item.fileId,
      type: item.isFolder ? 'folder' : 'file',
    };
  });

  const recoverFromTrash = () => {
    if (itemsToTrash.length > 0) {
      RecoverItemsFromTrash(itemsToTrash, itemsToTrash[0].isFolder ? itemsToTrash[0].parentId : itemsToTrash[0].folderId);
    }
  };

  const trashClient = await SdkFactory.getNewApiInstance().createTrashClient();
  await trashClient.addItemsToTrash({ items } as AddItemsToTrashPayload);

  store.dispatch(storageActions.popItems({ updateRecents: true, items: itemsToTrash }));
  store.dispatch(storageActions.clearSelectedItems());

  notificationsService.show({
    type: ToastType.Success,
    text: `${itemsToTrash.length > 1 ? itemsToTrash.length : ''} Item${itemsToTrash.length > 1 ? 's' : ''
      } moved to trash`,
    action: {
      text: 'Undo',
      onClick: () => {
        recoverFromTrash();
        console.log('UNDO');
      },
    },
  });
};

export default MoveItemsToTrash;
