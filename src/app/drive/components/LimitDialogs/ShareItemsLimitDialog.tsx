import { t } from 'i18next';
import ActionModal from '../../../shared/components/Modal/ActionModal';

interface ShareItemsLimitDialogProps {
  isOpen: boolean;
  onSeePlansButtonClicked: () => void;
  onClose: () => void;
  isLoading: boolean;
  shareItemsLimit: number;
}
const ShareItemsLimitDialog = ({
  isOpen,
  onClose,
  isLoading,
  onSeePlansButtonClicked,
  shareItemsLimit,
}: ShareItemsLimitDialogProps) => {
  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      actionButtonVariant="primary"
      onActionButtonClicked={onSeePlansButtonClicked}
      isLoading={isLoading}
      modalTexts={{
        title: t('modals.shareItemsLimitDialog.title'),
        description: t('modals.shareItemsLimitDialog.description', { limit: shareItemsLimit }),
        cancelButtonText: t('modals.shareItemsLimitDialog.cancelButtonText'),
        actionButtonText: t('modals.shareItemsLimitDialog.actionButtonText'),
        actionLoadingButtonText: t('modals.shareItemsLimitDialog.actionLoadingButtonText'),
      }}
    />
  );
};

export default ShareItemsLimitDialog;
