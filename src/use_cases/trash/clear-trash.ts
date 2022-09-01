import { SdkFactory } from '../../app/core/factory/sdk';
import { storageActions } from '../../app/store/slices/storage';
import { store } from '../../app/store';
import notificationsService, { ToastType } from '../../app/notifications/services/notifications.service';

const ClearTrash = async (): Promise<void> => {
  const trashClient = await SdkFactory.getInstance().createTrashClient();
  await trashClient.clearTrash();

  store.dispatch(storageActions.setItemsOnTrash([]));
  store.dispatch(storageActions.clearSelectedItems());

  notificationsService.show({
    type: ToastType.Success,
    text: 'Trash has been cleared',
  });
};

export default ClearTrash;
