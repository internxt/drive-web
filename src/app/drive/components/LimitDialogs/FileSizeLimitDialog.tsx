import { t } from 'i18next';
import ActionModal from '../../../shared/components/Modal/ActionModal';

interface FileSizeLimitDialogProps {
  isOpen: boolean;
  onSeePlansButtonClicked: () => void;
  onClose: () => void;
  isLoading: boolean;
  sizeLimit: string;
}
const FileSizeLimitDialog = ({
  isOpen,
  onClose,
  isLoading,
  onSeePlansButtonClicked,
  sizeLimit,
}: FileSizeLimitDialogProps) => {
  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      actionButtonVariant="primary"
      onActionButtonClicked={onSeePlansButtonClicked}
      isLoading={isLoading}
      modalTexts={{
        title: t('modals.fileSizeLimitDialog.title'),
        description: t('modals.fileSizeLimitDialog.description', { limit: sizeLimit }),
        cancelButtonText: t('modals.fileSizeLimitDialog.cancelButtonText'),
        actionButtonText: t('modals.fileSizeLimitDialog.actionButtonText'),
        actionLoadingButtonText: t('modals.fileSizeLimitDialog.actionLoadingButtonText'),
      }}
    />
  );
};

export default FileSizeLimitDialog;
