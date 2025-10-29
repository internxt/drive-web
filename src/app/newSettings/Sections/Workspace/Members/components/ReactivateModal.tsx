import { useTranslationContext } from '../../../../../i18n/provider/TranslationProvider';

import ActionModal from './ActionModal';

const ReactivateMemberModal = ({
  isOpen,
  onClose,
  name,
  onReactivate,
  isLoading,
}: {
  name: string;
  isOpen: boolean;
  onReactivate: () => void;
  onClose: () => void;
  isLoading: boolean;
}) => {
  const { translate } = useTranslationContext();

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      onActionButtonClicked={onReactivate}
      isLoading={isLoading}
      actionButtonVariant="primary"
      modalTexts={{
        title: translate('preferences.workspace.members.reactivationModal.title'),
        description: translate('preferences.workspace.members.reactivationModal.description', { name }),
        cancelButtonText: translate('actions.cancel'),
        actionButtonText: translate('preferences.workspace.members.reactivationModal.reactivate'),
        actionLoadingButtonText: translate('preferences.workspace.members.reactivationModal.reactivating'),
      }}
    />
  );
};

export default ReactivateMemberModal;
