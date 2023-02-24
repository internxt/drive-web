import { storageActions } from '../../app/store/slices/storage';
import { store } from '../../app/store';
import notificationsService, { ToastType } from '../../app/notifications/services/notifications.service';
import { SdkFactory } from '../../app/core/factory/sdk';
import { DriveItemData } from '../../app/drive/types';
import { DeleteItemsPermanentlyPayload } from '@internxt/sdk/dist/drive/trash/types';
import { deleteDatabaseItems } from '../../app/drive/services/database.service';
import { t } from 'i18next';

const DeleteItems = async (itemsToDelete: DriveItemData[]): Promise<void> => {
  const items: Array<{ id: number | string; type: string }> = itemsToDelete.map((item) => {
    return {
      id: item.id,
      type: item.isFolder ? 'folder' : 'file',
    };
  });
  const trashClient = await SdkFactory.getNewApiInstance().createTrashClient();
  await trashClient.deleteItemsPermanently({ items } as DeleteItemsPermanentlyPayload);

  await deleteDatabaseItems(itemsToDelete);

  store.dispatch(storageActions.popItemsToDelete(itemsToDelete));

  let foldersRemovedNumber = 0;
  let filesRemovedNumber = 0;

  itemsToDelete.forEach((item) => {
    if (item.isFolder) {
      foldersRemovedNumber = foldersRemovedNumber + 1;
    } else {
      filesRemovedNumber = filesRemovedNumber + 1;
    }
  });
  store.dispatch(storageActions.addFoldersOnTrashLength(-foldersRemovedNumber));
  store.dispatch(storageActions.addFilesOnTrashLength(-filesRemovedNumber));
  store.dispatch(storageActions.clearSelectedItems());

  notificationsService.show({
    type: ToastType.Success,
    text:
      items.length > 1
        ? t('notificationMessages.itemsDeleted')
        : t('notificationMessages.itemDeleted', {
            item: itemsToDelete[0].isFolder === true ? t('general.folder') : t('general.file'),
          }),
  });
};

export default DeleteItems;
