import { t } from 'i18next';
import ActionModal from '../../../shared/components/Modal/ActionModal';

interface FileSizeLimitDialogProps {
  isOpen: boolean;
  onSeePlansButtonClicked: () => void;
  onClose: () => void;
  isLoading: boolean;
}
const FileSizeLimitDialog = ({ isOpen, onClose, isLoading, onSeePlansButtonClicked }: FileSizeLimitDialogProps) => {
  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      actionButtonVariant="primary"
      onActionButtonClicked={onSeePlansButtonClicked}
      isLoading={isLoading}
      modalTexts={{
        title: t('modals.fileSizeLimitDialog.title'),
        description: t('modals.fileSizeLimitDialog.description'),
        cancelButtonText: t('modals.fileSizeLimitDialog.cancelButtonText'),
        actionButtonText: t('modals.fileSizeLimitDialog.actionButtonText'),
        actionLoadingButtonText: t('modals.fileSizeLimitDialog.actionLoadingButtonText'),
      }}
    />
  );
};

export default FileSizeLimitDialog;
