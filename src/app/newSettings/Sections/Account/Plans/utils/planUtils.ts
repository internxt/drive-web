import { DisplayPrice, RenewalPeriod, UserSubscription } from '@internxt/sdk/dist/drive/payments/types';
import { t } from 'i18next';
import { FreeStoragePlan, StoragePlan } from '../../../../../drive/types';
import moneyService from '../../../../../payment/services/money.service';
import { PlanState } from '../../../../../store/slices/plan';
import { ChangePlanType } from '../components/PlanCard';

const displayAmount = (amount: number) => {
  return (amount / 100).toFixed(2);
};

const getCurrentChangePlanType = ({
  priceSelected,
  currentUserSubscription,
  currentPlan,
  isFreePriceSelected,
}: {
  priceSelected: DisplayPrice;
  currentUserSubscription: UserSubscription | null;
  currentPlan: StoragePlan | null;
  isFreePriceSelected: boolean;
}): ChangePlanType => {
  const isSubscription = priceSelected?.interval === 'month' || priceSelected?.interval === 'year';

  if (currentUserSubscription?.type === 'free' && isFreePriceSelected) {
    return 'free';
  }

  if (isSubscription) {
    const currentStorage = parseInt(currentPlan?.storageLimit.toString() ?? '0');
    const selectedPlanStorage = priceSelected?.bytes;
    if (currentStorage < selectedPlanStorage) {
      return 'upgrade';
    }
    if (currentStorage > selectedPlanStorage) {
      return 'downgrade';
    }
    if (currentStorage === selectedPlanStorage) {
      return 'manageBilling';
    }

    return 'free';
  }

  if (priceSelected?.interval === 'lifetime') {
    return 'manageBilling';
  }

  return 'free';
};

const getPlanName = (storagePlan: StoragePlan | null) => {
  return storagePlan?.simpleName ?? FreeStoragePlan.simpleName;
};
const getCurrentUsage = (plan: PlanState) => {
  return plan.usageDetails?.total ?? -1;
};

const getPlanInfo = (storagePlan: StoragePlan | null) => {
  if (storagePlan) {
    if (storagePlan.paymentInterval === RenewalPeriod.Annually) {
      return (
        moneyService.getCurrencySymbol(storagePlan.currency) +
        storagePlan.price +
        '/' +
        t('views.account.tabs.billing.cancelSubscriptionModal.infoBox.year')
      );
    } else {
      return (
        moneyService.getCurrencySymbol(storagePlan.currency) +
        storagePlan.monthlyPrice +
        '/' +
        t('views.account.tabs.billing.cancelSubscriptionModal.infoBox.month')
      );
    }
  } else {
    return t('views.account.tabs.billing.cancelSubscriptionModal.infoBox.free');
  }
};

export { displayAmount, getCurrentChangePlanType, getCurrentUsage, getPlanInfo, getPlanName };
