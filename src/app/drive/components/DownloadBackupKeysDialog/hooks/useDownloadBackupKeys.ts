import { ActionDialog } from 'app/contexts/dialog-manager/ActionDialogManager.context';
import { useActionDialog } from 'app/contexts/dialog-manager/useActionDialog';
import { Translate } from 'app/i18n/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import dayjs from 'dayjs';
import { useState } from 'react';
import { localStorageService } from 'services';
import { handleExportBackupKey } from 'utils';

export const THIRTY_DAYS = 30;

export const useDownloadBackupKeys = (translate: Translate) => {
  const [isDownloadedKeys, setIsDownloadedKeys] = useState(false);
  const { isDialogOpen, openDialog, closeDialog } = useActionDialog();
  const backupKeysLocalStorage = localStorageService.getBackupKeys();
  const isBackupKeysDialogOpen = isDialogOpen(ActionDialog.DownloadBackupKey);

  const openBackupKeysDialog = () => {
    if (backupKeysLocalStorage.saved) return;

    const { seenAt } = backupKeysLocalStorage;

    if (!seenAt) {
      localStorageService.setBackupKeysSeenAt(dayjs().toISOString());
      return;
    }

    const hasExpired = dayjs().diff(dayjs(seenAt), 'day') >= THIRTY_DAYS;

    if (!hasExpired) return;

    localStorageService.setBackupKeysSeenAt(dayjs().toISOString());
    openDialog(ActionDialog.DownloadBackupKey);
  };

  const onRemindMeLaterButtonClicked = () => {
    localStorageService.setBackupKeysSeenAt(dayjs().toISOString());
    closeDialog(ActionDialog.DownloadBackupKey, { closeAllDialogsFirst: true });
  };

  const onBackupSavedButtonClicked = () => {
    localStorageService.setBackupKeysAcknowledged();
    if (backupKeysLocalStorage?.seenAt) localStorageService.removeBackupKeysSeenAt();
    notificationsService.show({ text: translate('modals.downloadBackupKeys.success'), type: ToastType.Success });
    closeDialog(ActionDialog.DownloadBackupKey, { closeAllDialogsFirst: true });
  };

  const onDownloadBackupKeysButtonClicked = () => {
    handleExportBackupKey(translate);
    setIsDownloadedKeys(true);
  };

  return {
    isDownloadedKeys,
    isBackupKeysDialogOpen,
    openBackupKeysDialog,
    onRemindMeLaterButtonClicked,
    onBackupSavedButtonClicked,
    onDownloadBackupKeysButtonClicked,
  };
};
