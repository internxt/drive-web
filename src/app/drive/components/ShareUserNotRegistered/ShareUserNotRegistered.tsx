import { Button } from '@internxt/ui';
import Modal from 'app/shared/components/Modal';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

interface ShareUserNotRegisteredProps {
  onAccept: () => void;
  onClose: () => void;
  isOpen: boolean;
}

const ShareUserNotRegistered = (props: ShareUserNotRegisteredProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const isOpen = props.isOpen;

  const onAccept = async () => {
    props.onAccept();
  };

  return (
    <Modal maxWidth="max-w-md" isOpen={isOpen} onClose={props.onClose}>
      <div className="flex flex-col space-y-5">
        <p className="text-2xl font-medium text-gray-100">
          {translate('modals.shareModal.invite.inviteNewUsersTitle')}
        </p>
        <p className="text-lg text-gray-80">{translate('modals.shareModal.invite.inviteNewUsersBody')}</p>

        <div className="flex flex-row items-center justify-end space-x-2">
          <Button variant="secondary" onClick={props.onClose}>
            {translate('modals.shareModal.invite.cancel')}
          </Button>
          <Button variant="primary" onClick={onAccept}>
            {translate('modals.shareModal.invite.accept')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ShareUserNotRegistered;
