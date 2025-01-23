import { Button } from '@internxt/ui';
import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';
import { handleExportBackupKey } from '../../../utils/backupKeyUtils';

const DownloadBackupKey = ({ onRedirect }: { onRedirect: () => void }) => {
  const { translate } = useTranslationContext();

  const handleKeyDownload = () => {
    handleExportBackupKey(translate);
    onRedirect();
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
      <div className="flex w-full pt-4">
        <Button
          className="w-full"
          variant="secondary"
          onClick={() => {
            onRedirect();
          }}
        >
          {translate('auth.downloadBackupKey.skip')}
        </Button>
      </div>
    </>
  );
};

export default DownloadBackupKey;
