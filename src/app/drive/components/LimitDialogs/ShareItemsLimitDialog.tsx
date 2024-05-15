import { t } from 'i18next';
import ActionModal from '../../../shared/components/Modal/ActionModal';

interface ShareItemsLimitDialogProps {
  isOpen: boolean;
  onSeePlansButtonClicked: () => void;
  onClose: () => void;
  isLoading: boolean;
  shareItemsLimit: number;
  typeOfLimitation: 'max_invites' | 'max_shares';
}
const ShareItemsLimitDialog = ({
  isOpen,
  onClose,
  isLoading,
  onSeePlansButtonClicked,
  shareItemsLimit,
  typeOfLimitation,
}: ShareItemsLimitDialogProps) => {
  const titleKey = typeOfLimitation === 'max_invites' ? 'maxInvitesTitle' : 'maxSharesTitle';
  const descriptionKey = typeOfLimitation === 'max_invites' ? 'maxInvitesDescription' : 'maxSharesDescription';

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      actionButtonVariant="primary"
      onActionButtonClicked={onSeePlansButtonClicked}
      isLoading={isLoading}
      modalTexts={{
        title: t(`modals.shareItemsLimitDialog.${titleKey}`),
        description: t(`modals.shareItemsLimitDialog.${descriptionKey}`, { limit: shareItemsLimit }),
        cancelButtonText: t('modals.shareItemsLimitDialog.cancelButtonText'),
        actionButtonText: t('modals.shareItemsLimitDialog.actionButtonText'),
        actionLoadingButtonText: t('modals.shareItemsLimitDialog.actionLoadingButtonText'),
      }}
    />
  );
};

export default ShareItemsLimitDialog;
