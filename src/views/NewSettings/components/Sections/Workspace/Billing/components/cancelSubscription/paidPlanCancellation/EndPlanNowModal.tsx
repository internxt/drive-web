import { Elements } from '@stripe/react-stripe-js';
import { Button, Modal } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { paymentService } from 'views/Checkout/services';
import ConfirmEarlyCancellationPayment from './ConfirmEarlyCancellationPayment';
import PlanDowngradeInfo from '../PlanDowngradeInfo';

interface EndPlanNowModalProps {
  isOpen: boolean;
  currentPlanName: string;
  currentPlanInfo: string;
  currentUsage: number;
  amountToPay?: number;
  isCancellingSubscription: boolean;
  earlyCancellationClientSecret: string | null;
  onEarlyCancel: () => void;
  onEarlyCancellationConfirmed: () => void;
  onGoBack: () => void;
}

const EndPlanNowModal = ({
  isOpen,
  currentPlanName,
  currentPlanInfo,
  currentUsage,
  amountToPay,
  isCancellingSubscription,
  earlyCancellationClientSecret,
  onEarlyCancel,
  onEarlyCancellationConfirmed,
  onGoBack,
}: EndPlanNowModalProps): JSX.Element => {
  const { translate } = useTranslationContext();

  return (
    <Modal isOpen={isOpen} onClose={onGoBack}>
      <div className="flex flex-col gap-4">
        <h4 className="text-2xl font-medium text-gray-100">
          {translate('views.account.tabs.billing.cancelSubscriptionModal.options.endNow.confirmationModal.title')}
        </h4>

        <div className="text-gray-100">
          <p>
            {translate(
              'views.account.tabs.billing.cancelSubscriptionModal.options.endNow.confirmationModal.description',
              { amount: amountToPay?.toFixed(2) },
            )}
          </p>
          <p className="mt-2">
            {translate('views.account.tabs.billing.cancelSubscriptionModal.options.endNow.confirmationModal.afterThis')}
          </p>
          <ul className="list-disc pl-5">
            <li>
              {translate(
                'views.account.tabs.billing.cancelSubscriptionModal.options.endNow.confirmationModal.accessEndsImmediately',
              )}
            </li>
            <li>
              {translate(
                'views.account.tabs.billing.cancelSubscriptionModal.options.endNow.confirmationModal.noFurtherCharges',
              )}
            </li>
          </ul>
        </div>

        <PlanDowngradeInfo
          currentPlanName={currentPlanName}
          currentPlanInfo={currentPlanInfo}
          currentUsage={currentUsage}
        />

        <div className="flex flex-row items-center justify-end gap-2">
          <Button variant="secondary" onClick={onGoBack} disabled={isCancellingSubscription}>
            {translate('views.account.tabs.billing.cancelSubscriptionModal.options.endNow.confirmationModal.goBack')}
          </Button>
          <Button
            variant="primary"
            onClick={onEarlyCancel}
            disabled={isCancellingSubscription}
            loading={isCancellingSubscription}
          >
            {translate('views.account.tabs.billing.cancelSubscriptionModal.options.endNow.confirmationModal.confirm')}
          </Button>
        </div>

        {earlyCancellationClientSecret && (
          <Elements stripe={paymentService.getStripe()} options={{ clientSecret: earlyCancellationClientSecret }}>
            <ConfirmEarlyCancellationPayment
              clientSecret={earlyCancellationClientSecret}
              onConfirmed={onEarlyCancellationConfirmed}
              onError={onGoBack}
            />
          </Elements>
        )}
      </div>
    </Modal>
  );
};

export default EndPlanNowModal;
