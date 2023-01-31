import { get } from 'app/i18n/services/i18n.service';
import { saveAs } from 'file-saver';
import notificationsService, { ToastType } from '../../../../../notifications/services/notifications.service';
import Button from '../../../../../shared/components/Button/Button';
import Card from '../../../../../shared/components/Card';
import localStorageService from '../../../../services/local-storage.service';
import Section from '../../components/Section';

export default function BackupKey({ className = '' }: { className?: string }): JSX.Element {
  function handleExport() {
    const mnemonic = localStorageService.get('xMnemonic');
    if (!mnemonic) {
      notificationsService.show({
        text: get('views.account.tabs.security.backupKey.error'),
        type: ToastType.Error,
      });
    } else {
      saveAs(new Blob([mnemonic], { type: 'text/plain' }), 'INTERNXT-BACKUP-KEY.txt');
      notificationsService.show({
        text: get('views.account.tabs.security.backupKey.success'),
        type: ToastType.Success,
      });
    }
  }

  return (
    <Section className={className} title={get('views.account.tabs.security.backupKey.title')}>
      <Card>
        <p className="text-gray-60">{get('views.account.tabs.security.backupKey.description')}</p>
        <Button onClick={handleExport} className="mt-3">
          {get('views.account.tabs.security.backupKey.button')}
        </Button>
      </Card>
    </Section>
  );
}
