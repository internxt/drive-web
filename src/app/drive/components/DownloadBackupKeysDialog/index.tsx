import { BaseDialog, Button } from '@internxt/ui';
import { DownloadSimple, Info } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useDownloadBackupKeys } from './hooks/useDownloadBackupKeys';

export const DownloadBackupKeysDialog = () => {
  const { translate } = useTranslationContext();
  const {
    isBackupKeysDialogOpen,
    isDownloadedKeys,
    onDownloadBackupKeysButtonClicked,
    onBackupSavedButtonClicked,
    onRemindMeLaterButtonClicked,
  } = useDownloadBackupKeys(translate);

  const onCloseButtonClicked = () => {
    if (isDownloadedKeys) onBackupSavedButtonClicked();
    else onRemindMeLaterButtonClicked();
  };

  return (
    <BaseDialog
      isOpen={isBackupKeysDialogOpen}
      title={translate('modals.downloadBackupsKey.title')}
      dialogRounded={true}
      panelClasses="w-screen max-w-lg"
      titleClasses="font-medium text-left"
      closeClass="shrink-0 flex items-center justify-center h-10 w-10 hover:bg-black/2 rounded-md focus:bg-black/5"
      onClose={onCloseButtonClicked}
      weightIcon="light"
      dataTest="backup-keys-dialog"
    >
      <div className="flex flex-col w-full p-5 gap-5">
        <p className="text-gray-80">{translate('modals.downloadBackupsKey.description')}</p>

        {/* Download backup key */}
        <div className="flex flex-col items-center">
          <Button variant="secondary" onClick={onDownloadBackupKeysButtonClicked}>
            {translate('modals.downloadBackupsKey.download')}
            <DownloadSimple size={24} className="ml-2" />
          </Button>
        </div>

        {/* Info */}
        <div className="flex flex-row items-center justify-center gap-3">
          <Info size={24} className="text-primary" />
          <div className="flex flex-col">
            <p className="text-gray-60">{translate('modals.downloadBackupsKey.info.text')}</p>
            <p className="text-gray-60 font-semibold">{translate('modals.downloadBackupsKey.info.path')}</p>
          </div>
        </div>
        <div className="flex flex-row gap-3 items-center justify-end pt-5">
          <Button variant="secondary" onClick={onRemindMeLaterButtonClicked}>
            {translate('actions.remindMeLater')}
          </Button>
          <Button variant="primary" disabled={!isDownloadedKeys} onClick={onBackupSavedButtonClicked}>
            {translate('actions.backupKeySaved')}
          </Button>
        </div>
      </div>
    </BaseDialog>
  );
};
