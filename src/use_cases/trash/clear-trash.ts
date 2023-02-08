import { SdkFactory } from '../../app/core/factory/sdk';
import { storageActions } from '../../app/store/slices/storage';
import { store } from '../../app/store';
import notificationsService, { ToastType } from '../../app/notifications/services/notifications.service';
import { t } from 'i18next';

const ClearTrash = async (): Promise<void> => {
  const trashClient = await SdkFactory.getNewApiInstance().createTrashClient();
  await trashClient.clearTrash();

  store.dispatch(storageActions.setItemsOnTrash([]));
  store.dispatch(storageActions.clearSelectedItems());

  notificationsService.show({
    type: ToastType.Success,
    text: t('trash.clearTrash'),
  });
};

export default ClearTrash;
