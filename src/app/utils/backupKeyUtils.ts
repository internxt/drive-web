import { saveAs } from 'file-saver';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import localStorageService from 'app/core/services/local-storage.service';
import { TrackingPlan } from 'app/analytics/TrackingPlan';

/**
 * Downloads the backup key of the user and shows a notification
 * @param translate used for the notification message
 */

export function handleExportBackupKey(translate) {
  const trackBackupKeyDownloadedProperties: TrackingPlan.BackupKeyDownloadedProperties = {
    backup_key_downloaded: true,
  };
  const mnemonic = localStorageService.get('xMnemonic');
  if (!mnemonic) {
    notificationsService.show({
      text: translate('views.account.tabs.security.backupKey.error'),
      type: ToastType.Error,
    });
  } else {
    saveAs(new Blob([mnemonic], { type: 'text/plain' }), 'INTERNXT-BACKUP-KEY.txt');
    notificationsService.show({
      text: translate('views.account.tabs.security.backupKey.success'),
      type: ToastType.Success,
    });
  }
}
