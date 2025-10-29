import { useTranslationContext } from '../../../../../i18n/provider/TranslationProvider';

import ActionModal from './ActionModal';

const LeaveMemberModal = ({
  isOpen,
  onClose,
  name,
  onLeave,
  isLoading,
}: {
  name: string;
  isOpen: boolean;
  onLeave: () => void;
  onClose: () => void;
  isLoading: boolean;
}) => {
  const { translate } = useTranslationContext();

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      onActionButtonClicked={onLeave}
      isLoading={isLoading}
      modalTexts={{
        title: translate('preferences.workspace.members.leaveModal.title'),
        description: translate('preferences.workspace.members.leaveModal.description', { name }),
        cancelButtonText: translate('actions.cancel'),
        actionButtonText: translate('preferences.workspace.members.leaveModal.leave'),
        actionLoadingButtonText: translate('preferences.workspace.members.leaveModal.leaving'),
      }}
    />
  );
};

export default LeaveMemberModal;
