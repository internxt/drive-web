import { useEffect, useState } from 'react';
import { useTranslationContext } from '../../../../../i18n/provider/TranslationProvider';
import TextArea from '../../../Account/Account/components/TextArea';

import ActionModal from './ActionModal';

const RequestPasswordChangeModal = ({
  isOpen,
  onClose,
  onSendRequest,
  isLoading,
  modalWitdhClassname,
}: {
  isOpen: boolean;
  onSendRequest: () => void;
  onClose: () => void;
  isLoading: boolean;
  modalWitdhClassname: string;
}) => {
  const { translate } = useTranslationContext();
  const [message, setMessage] = useState('');

  useEffect(() => {
    setMessage('');
  }, [isOpen]);

  return (
    <ActionModal
      isOpen={isOpen}
      onClose={onClose}
      isLoading={isLoading}
      actionButtonVariant="primary"
      onActionButtonClicked={onSendRequest}
      modalWitdhClassname={modalWitdhClassname}
      modalTexts={{
        title: translate('preferences.workspace.members.changePasswordModal.title'),
        description: translate('preferences.workspace.members.changePasswordModal.description'),
        cancelButtonText: translate('actions.cancel'),
        actionButtonText: translate('preferences.workspace.members.changePasswordModal.actionButton'),
        actionLoadingButtonText: translate('preferences.workspace.members.changePasswordModal.actionButton'),
      }}
    >
      <TextArea
        titleText="Message"
        placeholder={translate('preferences.workspace.members.changePasswordModal.inputPlaceholder')}
        value={message}
        onChangeValue={setMessage}
        disabled={isLoading}
        rows={3}
        maxCharacters={250}
      />
    </ActionModal>
  );
};

export default RequestPasswordChangeModal;
