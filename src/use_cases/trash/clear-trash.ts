import { t } from 'i18next';
import { SdkFactory } from '../../app/core/factory/sdk';
import errorService from '../../app/core/services/error.service';
import workspacesService from '../../app/core/services/workspace.service';
import notificationsService, { ToastType } from '../../app/notifications/services/notifications.service';
import { store } from '../../app/store';
import { storageActions } from '../../app/store/slices/storage';

const clearTrash = async (workspaceId?: string): Promise<void> => {
  let deletingItemsToastId;

  try {
    deletingItemsToastId = notificationsService.show({
      type: ToastType.Loading,
      text: t('drive.deletingItems'),
      duration: 100000,
      closable: false,
    });

    if (workspaceId) {
      await workspacesService.emptyTrash(workspaceId);
    } else {
      const trashClient = SdkFactory.getNewApiInstance().createTrashClient();
      await trashClient.clearTrash();
    }
    store.dispatch(storageActions.resetTrash());
    store.dispatch(storageActions.clearSelectedItems());

    notificationsService.dismiss(deletingItemsToastId);
    notificationsService.show({
      type: ToastType.Success,
      text: t('trash.clearTrash'),
    });
  } catch (error) {
    notificationsService.dismiss(deletingItemsToastId);
    notificationsService.show({
      text: t('error.errorDeletingFromTrash'),
      type: ToastType.Error,
    });

    errorService.reportError(error);
  }
};

export default clearTrash;
