import { saveAs } from 'file-saver';
import { useTranslation } from 'react-i18next';
import notificationsService, { ToastType } from '../../../../../notifications/services/notifications.service';
import Button from '../../../../../shared/components/Button/Button';
import Card from '../../../../../shared/components/Card';
import localStorageService from '../../../../services/local-storage.service';
import Section from '../../components/Section';

export default function BackupKey({ className = '' }: { className?: string }): JSX.Element {
  const { t } = useTranslation();
  function handleExport() {
    const mnemonic = localStorageService.get('xMnemonic');
    if (!mnemonic) {
      notificationsService.show({
        text: t('views.account.tabs.security.backupKey.error'),
        type: ToastType.Error,
      });
    } else {
      saveAs(new Blob([mnemonic], { type: 'text/plain' }), 'INTERNXT-BACKUP-KEY.txt');
      notificationsService.show({
        text: t('views.account.tabs.security.backupKey.success'),
        type: ToastType.Success,
      });
    }
  }

  return (
    <Section className={className} title={t('views.account.tabs.security.backupKey.title')}>
      <Card>
        <p className="text-gray-60">{t('views.account.tabs.security.backupKey.description')}</p>
        <Button onClick={handleExport} className="mt-3">
          {t('views.account.tabs.security.backupKey.button')}
        </Button>
      </Card>
    </Section>
  );
}
