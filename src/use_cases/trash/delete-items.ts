import { storageActions } from '../../app/store/slices/storage';
import { store } from '../../app/store';
import notificationsService, { ToastType } from '../../app/notifications/services/notifications.service';
import { SdkFactory } from '../../app/core/factory/sdk';
import { DriveItemData } from '../../app/drive/types';
import { DeleteItemsPermanentlyPayload } from '@internxt/sdk/dist/drive/trash/types';
import { deleteDatabaseItemsFromDifferentFolders } from '../../app/database/services/database.service/utils';

const DeleteItems = async (itemsToDelete: DriveItemData[]): Promise<void> => {
  const items: Array<{ id: number | string; type: string }> = itemsToDelete.map((item) => {
    return {
      id: item.id,
      type: item.isFolder ? 'folder' : 'file',
    };
  });
  const trashClient = await SdkFactory.getNewApiInstance().createTrashClient();
  await trashClient.deleteItemsPermanently({ items } as DeleteItemsPermanentlyPayload);

  await deleteDatabaseItemsFromDifferentFolders(itemsToDelete);

  store.dispatch(storageActions.popItemsToDelete(itemsToDelete));
  store.dispatch(storageActions.clearSelectedItems());

  notificationsService.show({
    type: ToastType.Success,
    text: `${items.length > 1 ? items.length : ''} Item${items.length > 1 ? 's' : ''} deleted`,
  });
};

export default DeleteItems;
