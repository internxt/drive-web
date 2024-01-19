import Button from '../../../shared/components/Button/Button';
import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';
import { handleExport } from '../../../core/views/Preferences/tabs/Security/BackupKey';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';

const DownloadBackupKey = () => {
  const { translate } = useTranslationContext();

  const handleKeyDownload = () => {
    handleExport(translate);
    navigationService.push(AppView.Drive);
  };

  return (
    <>
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-medium">{translate('auth.downloadBackupKey.title')}</h1>
        <p className="text-sm text-gray-80">{translate('auth.downloadBackupKey.description')}</p>
      </div>
      <div className="flex w-full flex-col space-y-2">
        <Button onClick={handleKeyDownload} className="mt-3">
          {translate('auth.downloadBackupKey.downloadCta')}
        </Button>
        <p className="text-xs text-gray-60">{translate('auth.downloadBackupKey.settingsTab')}</p>
      </div>
      <div className="flex w-full">
        <Button
          className="w-full"
          variant="secondary"
          onClick={() => {
            navigationService.push(AppView.Drive);
          }}
        >
          {translate('auth.downloadBackupKey.skip')}
        </Button>
      </div>
    </>
  );
};

export default DownloadBackupKey;
