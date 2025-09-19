import { Dialog } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

interface UpgradeToDialog {
  isDialogOpen: boolean;
  onCloseDialog: () => void;
  onAccept: () => void;
}

export const RestrictedSharingDialog = ({ isDialogOpen, onAccept, onCloseDialog }: UpgradeToDialog) => {
  const { translate } = useTranslationContext();

  const title = translate('modals.restrictedSharingModal.title');
  const subtitle = translate('modals.restrictedSharingModal.subtitle');
  const primaryAction = translate('actions.upgrade');
  const secondaryAction = translate('actions.cancel');

  return (
    <Dialog
      isOpen={isDialogOpen}
      onClose={onCloseDialog}
      onSecondaryAction={onCloseDialog}
      onPrimaryAction={onAccept}
      title={title}
      subtitle={subtitle}
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
      primaryActionColor="primary"
    />
  );
};
