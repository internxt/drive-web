import { saveAs } from 'file-saver';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import localStorageService from 'app/core/services/local-storage.service';

/**
 * Downloads the backup key of the user and shows a notification
 * @param translate used for the notification message
 */

export interface BackupData {
  mnemonic: string;
  privateKey: string;
  keys: {
    ecc: string;
    kyber: string;
  };
}
export function handleExportBackupKey(translate) {
  const mnemonic = localStorageService.get('xMnemonic');
  const user = localStorageService.getUser();

  if (!mnemonic || !user) {
    notificationsService.show({
      text: translate('views.account.tabs.security.backupKey.error'),
      type: ToastType.Error,
    });
  } else {
    const backupData: BackupData = {
      mnemonic,
      privateKey: user.privateKey,
      keys: {
        ecc: user.keys?.ecc?.privateKey || user.privateKey,
        kyber: user.keys?.kyber?.privateKey || '',
      },
    };

    const backupContent = JSON.stringify(backupData, null, 2);
    saveAs(new Blob([backupContent], { type: 'text/plain' }), 'INTERNXT-BACKUP-KEY.txt');

    notificationsService.show({
      text: translate('views.account.tabs.security.backupKey.success'),
      type: ToastType.Success,
    });
  }
}
