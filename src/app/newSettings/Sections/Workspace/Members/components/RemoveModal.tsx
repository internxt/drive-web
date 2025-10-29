import { useTranslationContext } from '../../../../../i18n/provider/TranslationProvider';

import ActionModal from './ActionModal';

const RemoveMemberModal = ({
  isOpen,
  onClose,
  name,
  onRemove,
  isLoading,
}: {
  name: string;
  isOpen: boolean;
  onRemove: () => void;
  onClose: () => void;
  isLoading: boolean;
}) => {
  const { translate } = useTranslationContext();

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      onActionButtonClicked={onRemove}
      isLoading={isLoading}
      modalTexts={{
        title: translate('preferences.workspace.members.removalModal.title'),
        description: translate('preferences.workspace.members.removalModal.description', { name }),
        cancelButtonText: translate('actions.cancel'),
        actionButtonText: translate('preferences.workspace.members.removalModal.remove'),
        actionLoadingButtonText: translate('preferences.workspace.members.removalModal.removing'),
      }}
    />
  );
};

export default RemoveMemberModal;
