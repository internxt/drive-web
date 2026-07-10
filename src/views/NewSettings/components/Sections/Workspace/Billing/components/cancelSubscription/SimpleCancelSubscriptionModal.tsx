import { Button, Modal } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

interface SimpleCancelSubscriptionModalProps {
  isOpen: boolean;
  description: string;
  isCancellingSubscription: boolean;
  cancelSubscription: () => void;
  onClose: () => void;
}

const SimpleCancelSubscriptionModal = ({
  isOpen,
  description,
  isCancellingSubscription,
  cancelSubscription,
  onClose,
}: SimpleCancelSubscriptionModalProps): JSX.Element => {
  const { translate } = useTranslationContext();

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <p className="mt-4 text-lg text-gray-100">{description}</p>

      <div className="mt-5 flex justify-end">
        <Button
          className={'shadow-subtle-hard'}
          variant="secondary"
          disabled={isCancellingSubscription}
          onClick={cancelSubscription}
        >
          {translate('views.account.tabs.billing.cancelSubscriptionModal.cancelSubscription')}
        </Button>
        <Button className="ml-2 shadow-subtle-hard" disabled={isCancellingSubscription} onClick={onClose}>
          {translate('views.account.tabs.billing.cancelSubscriptionModal.keepSubscription')}
        </Button>
      </div>
    </Modal>
  );
};

export default SimpleCancelSubscriptionModal;
