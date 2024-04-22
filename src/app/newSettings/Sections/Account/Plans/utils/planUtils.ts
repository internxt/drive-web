import { DisplayPrice, UserSubscription } from '@internxt/sdk/dist/drive/payments/types';
import { StoragePlan } from '../../../../../drive/types';
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

export { displayAmount, getCurrentChangePlanType };
