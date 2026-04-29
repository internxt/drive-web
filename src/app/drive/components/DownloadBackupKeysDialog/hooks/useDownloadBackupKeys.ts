import { ActionDialog } from 'app/contexts/dialog-manager/ActionDialogManager.context';
import { useActionDialog } from 'app/contexts/dialog-manager/useActionDialog';
import { Translate } from 'app/i18n/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { useState } from 'react';
import { localStorageService, STORAGE_KEYS } from 'services';
import { handleExportBackupKey } from 'utils';

export const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;

export const useDownloadBackupKeys = (translate: Translate) => {
  const [isDownloadedKeys, setIsDownloadedKeys] = useState(false);
  const { isDialogOpen, openDialog, closeDialog } = useActionDialog();
  const backupKeysLocalStorage = localStorageService.getBackupKeys();
  const isBackupKeysDialogOpen = isDialogOpen(ActionDialog.DownloadBackupKey);

  const openBackupKeysDialog = () => {
    const remindMeLater = backupKeysLocalStorage.remindMeLater;
    const remindTimestamp = remindMeLater ? new Date(remindMeLater).getTime() : 0;

    const hasExpired = !remindTimestamp || Date.now() - remindTimestamp >= FOURTEEN_DAYS;

    if (backupKeysLocalStorage.saved || !hasExpired) return;

    openDialog(ActionDialog.DownloadBackupKey);
  };

  const onRemindMeLaterButtonClicked = () => {
    const now = new Date();
    localStorageService.setBackupKeysRemindLater(now.toISOString());
    closeDialog(ActionDialog.DownloadBackupKey, { closeAllDialogsFirst: true });
  };

  const onBackupSavedButtonClicked = () => {
    localStorageService.setBackupKeysAcknowledged();
    if (backupKeysLocalStorage?.remindMeLater) localStorageService.removeItem(STORAGE_KEYS.BACKUP_KEY.REMIND_LATER_AT);
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
