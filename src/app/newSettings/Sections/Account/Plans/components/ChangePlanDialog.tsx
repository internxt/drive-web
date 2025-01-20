import { DisplayPrice, UserType } from '@internxt/sdk/dist/drive/payments/types';
import { ArrowRight } from '@phosphor-icons/react';
import { useSelector } from 'react-redux';
import { bytesToString } from '../../../../../drive/services/size.service';
import { useTranslationContext } from '../../../../../i18n/provider/TranslationProvider';
import moneyService from '../../../../../payment/services/currency.service';
import { Button } from '@internxt/ui';
import Modal from '../../../../../shared/components/Modal';
import { RootState } from '../../../../../store';
import { PlanState } from '../../../../../store/slices/plan';

const ChangePlanDialog = ({
  prices,
  isDialogOpen,
  setIsDialogOpen,
  onPlanClick,
  isUpdatingSubscription,
  priceIdSelected,
  subscriptionSelected,
  isLoading,
}: {
  prices: DisplayPrice[];
  isDialogOpen: boolean;
  isUpdatingSubscription?: boolean;
  setIsDialogOpen: (value: boolean) => void;
  onPlanClick: (value: string, currency: string) => void;
  priceIdSelected: string;
  subscriptionSelected: UserType;
  isLoading?: boolean;
}): JSX.Element => {
  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const { translate } = useTranslationContext();
  const isIndividualSubscription = subscriptionSelected == UserType.Individual;

  const {
    planLimit,
    planUsage,
    businessPlanLimit,
    businessPlan,
    businessPlanUsage,
    individualSubscription,
    businessSubscription,
  } = plan;

  const subscription = isIndividualSubscription ? individualSubscription : businessSubscription;
  const selectedPlan: DisplayPrice = prices.find((price) => price.id === priceIdSelected) as DisplayPrice;

  const selectedPlanSize = selectedPlan?.bytes;
  const selectedPlanSizeString = bytesToString(selectedPlanSize);
  const selectedPlanAmount = selectedPlan?.amount;
  const selectedPlanInterval = selectedPlan?.interval;
  const currentPlanSizeString = bytesToString(
    isIndividualSubscription ? planLimit : (businessPlan?.storageLimit ?? businessPlanLimit),
  );
  const currentPlanUsage = isIndividualSubscription ? planUsage : businessPlanUsage;
  let amountMonthly: number | null = null;
  let currentAmountMonthly: number | null = null;
  let subscriptionCurrencySymbol: string | null = null;

  if (selectedPlanInterval === 'month') {
    amountMonthly = selectedPlanAmount;
  } else if (selectedPlanInterval === 'year') {
    amountMonthly = selectedPlanAmount / 12;
  }

  if (subscription?.type === 'subscription') {
    subscriptionCurrencySymbol = moneyService.getCurrencySymbol(subscription?.currency.toUpperCase());
    if (subscription.interval === 'month') {
      currentAmountMonthly = subscription.amount;
    } else if (subscription.interval === 'year') {
      currentAmountMonthly = subscription.amount / 12;
    }
  }

  const onClose = (): void => {
    setIsDialogOpen(false);
  };

  const displayAmount = (value) => {
    return (value / 100).toFixed(2);
  };

  return (
    <Modal isOpen={isDialogOpen} onClose={onClose}>
      <h3 className="mb-5 text-2xl font-medium">{translate('views.account.tabs.plans.dialog.title')}</h3>
      <p className="font-regular mb-9 text-lg">
        {translate('views.account.tabs.plans.dialog.subtitle1')}
        <span className="font-semibold">{currentPlanSizeString}</span>
        {translate('views.account.tabs.plans.dialog.subtitle2')}
        <span className="font-semibold">{selectedPlanSizeString}</span>
        {translate('views.account.tabs.plans.dialog.subtitle3')}
      </p>
      <div className="mb-9 flex items-center justify-center">
        <div className="flex w-40 flex-col items-center rounded-xl border border-gray-10 p-4 shadow-soft">
          <p className="mb-2.5 rounded-xl border border-gray-10 bg-gray-5 px-2 py-1 text-xs font-medium text-gray-80">
            {translate('views.account.tabs.plans.dialog.plan.current')}
          </p>
          <p className="text-2xl font-medium text-primary">{currentPlanSizeString}</p>
          {subscription?.type === 'subscription' ? (
            <div>
              <span className="text-base font-medium">{`${displayAmount(currentAmountMonthly)} ${
                subscriptionCurrencySymbol || ''
              }`}</span>
              <span>/</span>
              <span className="text-xs font-medium">{translate('views.account.tabs.plans.dialog.plan.interval')}</span>
            </div>
          ) : (
            <p className="text-base font-medium capitalize">{subscription?.type}</p>
          )}
        </div>
        <ArrowRight size={32} className="mx-5 font-semibold text-gray-20" />
        <div className="flex w-40 flex-col items-center rounded-xl border border-gray-10 p-4 shadow-soft">
          <p className="mb-2.5 rounded-xl border border-gray-10 bg-gray-5 px-2 py-1 text-xs font-medium text-gray-80">
            {translate('views.account.tabs.plans.dialog.plan.new')}
          </p>
          <p className={`text-2xl font-medium ${selectedPlanSize < currentPlanUsage ? 'text-red' : 'text-primary'}`}>
            {selectedPlanSizeString}
          </p>
          {selectedPlanInterval === 'lifetime' ? (
            <div>
              <span className="text-base font-medium">{`${displayAmount(selectedPlanAmount)} ${
                subscriptionCurrencySymbol || ''
              }`}</span>
            </div>
          ) : (
            <div>
              <span className="text-base font-medium">{`${displayAmount(amountMonthly)} ${
                subscriptionCurrencySymbol || ''
              }`}</span>
              <span>/</span>
              <span className="text-xs font-medium">{translate('views.account.tabs.plans.dialog.plan.interval')}</span>
            </div>
          )}
        </div>
      </div>
      {selectedPlanSize < currentPlanUsage && (
        <div className="mb-5 flex flex-col items-center rounded-xl border border-red/20 bg-red/10 px-4 py-5 text-red">
          <h4 className="mb-1.5 text-center text-xl font-semibold">
            {translate('views.account.tabs.plans.dialog.alert.title')}
            {selectedPlanSizeString}
          </h4>
          <p className="font-regular text-center text-base">
            {translate('views.account.tabs.plans.dialog.alert.text1')}
            <span className="font-semibold">{bytesToString(currentPlanUsage)}</span>
            {translate('views.account.tabs.plans.dialog.alert.text2')}
          </p>
        </div>
      )}
      <div className="font-regular mb-5  rounded-xl bg-gray-5 p-4 text-center text-base">
        <p>{translate('views.account.tabs.plans.dialog.message.text')}</p>
      </div>
      <div className="flex w-full justify-end">
        <Button className="mr-2" variant="secondary" onClick={onClose}>
          {translate('views.account.tabs.plans.dialog.button.back')}
        </Button>
        <Button
          variant="primary"
          onClick={() => onPlanClick(priceIdSelected, selectedPlan?.currency)}
          loading={isLoading}
          disabled={isUpdatingSubscription}
        >
          {translate('views.account.tabs.plans.dialog.button.continue')}
        </Button>
      </div>
    </Modal>
  );
};

export default ChangePlanDialog;
