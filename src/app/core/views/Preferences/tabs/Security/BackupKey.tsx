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
      notificationsService.show({ text: 'We could not generate your backup key', type: ToastType.Error });
    } else {
      saveAs(new Blob([mnemonic], { type: 'text/plain' }), 'INTERNXT-BACKUP-KEY.txt');
      notificationsService.show({ text: 'Backup key downloaded succesfully', type: ToastType.Success });
    }
  }

  return (
    <Section className={className} title="Backup key">
      <Card>
        <p className="text-gray-60">
          In case you forget your password you can use your backup key to recover your account. Never share this code
          with anyone.
        </p>
        <Button onClick={handleExport} className="mt-3">
          Export backup key
        </Button>
      </Card>
    </Section>
  );
}
