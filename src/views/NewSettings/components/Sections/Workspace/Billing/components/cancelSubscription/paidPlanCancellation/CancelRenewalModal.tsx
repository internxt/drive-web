import { Button, Modal } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

interface CancelRenewalProps {
  isCancelRenewalOpen: boolean;
  isCancellingSubscription: boolean;
  commitmentRenewal?: string;
  onGoBack: () => void;
  cancelSubscription: () => void;
}

const CancelRenewalModal = ({
  isCancelRenewalOpen,
  isCancellingSubscription,
  commitmentRenewal,
  cancelSubscription,
  onGoBack,
}: CancelRenewalProps) => {
  const { translate } = useTranslationContext();

  return (
    <Modal isOpen={isCancelRenewalOpen} onClose={onGoBack} preventClosing>
      <div className="flex flex-col gap-4">
        <p className="text-3xl font-bold text-gray-100">
          {translate('views.account.tabs.billing.cancelSubscriptionModal.options.cancelRenewal.title')}
        </p>
        <p className="text-lg">
          {translate(
            'views.account.tabs.billing.cancelSubscriptionModal.options.cancelRenewal.confirmationModal.description',
            {
              endDate: commitmentRenewal,
            },
          )}
        </p>
        <div className="flex flex-row gap-2 items-center w-full justify-end">
          <Button variant="secondary" onClick={onGoBack}>
            {translate(
              'views.account.tabs.billing.cancelSubscriptionModal.options.cancelRenewal.confirmationModal.goBack',
            )}
          </Button>
          <Button
            variant="destructive"
            onClick={cancelSubscription}
            disabled={isCancellingSubscription}
            loading={isCancellingSubscription}
          >
            {translate(
              'views.account.tabs.billing.cancelSubscriptionModal.options.cancelRenewal.confirmationModal.confirm',
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CancelRenewalModal;
