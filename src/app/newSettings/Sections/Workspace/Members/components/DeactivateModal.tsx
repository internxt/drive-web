import { useTranslationContext } from '../../../../../i18n/provider/TranslationProvider';

import ActionModal from './ActionModal';

const DeactivateMemberModal = ({
  isOpen,
  onClose,
  name,
  onDeactivate,
  isLoading,
}: {
  name: string;
  isOpen: boolean;
  onDeactivate: () => void;
  onClose: () => void;
  isLoading: boolean;
}) => {
  const { translate } = useTranslationContext();

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      onActionButtonClicked={onDeactivate}
      isLoading={isLoading}
      modalTexts={{
        title: translate('preferences.workspace.members.deactivationModal.title'),
        description: translate('preferences.workspace.members.deactivationModal.description', { name }),
        cancelButtonText: translate('actions.cancel'),
        actionButtonText: translate('preferences.workspace.members.deactivationModal.deactivate'),
        actionLoadingButtonText: translate('preferences.workspace.members.deactivationModal.deactivating'),
      }}
    />
  );
};

export default DeactivateMemberModal;
