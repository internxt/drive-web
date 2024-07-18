import { DisplayPrice, RenewalPeriod, StoragePlan, UserSubscription } from '@internxt/sdk/dist/drive/payments/types';
import { UsageResponse } from '@internxt/sdk/dist/drive/storage/types';
import { bytesToString } from 'app/drive/services/size.service';
import { t } from 'i18next';
import { FreeStoragePlan } from '../../../../../drive/types';
import moneyService from '../../../../../payment/services/money.service';
import { ChangePlanType } from '../components/PlanCard';

function displayAmount(value: number, decimalPoints = 2) {
  return (value / 100).toFixed(decimalPoints);
}

const getCurrentChangePlanType = ({
  priceSelected,
  currentUserSubscription,
  planLimit,
  isFreePriceSelected,
}: {
  priceSelected: DisplayPrice;
  currentUserSubscription: UserSubscription | null;
  planLimit: number | null;
  isFreePriceSelected: boolean;
}): ChangePlanType => {
  const isIntervalSelected =
    priceSelected?.interval === 'month' || priceSelected?.interval === 'year' || priceSelected?.interval === 'lifetime';

  const currentStorage = planLimit ?? 0;
  const selectedPlanStorage = priceSelected?.bytes;

  if (currentUserSubscription?.type === 'free' && isFreePriceSelected) {
    return 'free';
  }

  if (isIntervalSelected) {
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

  return 'free';
};

const getPlanName = (storagePlan: StoragePlan | null, limit?: number) => {
  if (storagePlan?.simpleName) return storagePlan?.simpleName;
  if (limit) return bytesToString(limit, false);
  return FreeStoragePlan.simpleName;
};
const getCurrentUsage = (usage: UsageResponse | null) => {
  return usage?.total ?? -1;
};

const getPlanInfo = (storagePlan: StoragePlan | null) => {
  if (storagePlan) {
    if (storagePlan.paymentInterval === RenewalPeriod.Annually) {
      const priceTruncated = Math.trunc(storagePlan.price * 100) / 100;
      return (
        `${priceTruncated} ` +
        moneyService.getCurrencySymbol(storagePlan.currency) +
        '/' +
        t('views.account.tabs.billing.cancelSubscriptionModal.infoBox.year')
      );
    } else {
      const priceTruncated = Math.trunc(storagePlan.monthlyPrice * 100) / 100;
      return (
        `${priceTruncated} ` +
        moneyService.getCurrencySymbol(storagePlan.currency) +
        '/' +
        t('views.account.tabs.billing.cancelSubscriptionModal.infoBox.month')
      );
    }
  } else {
    return t('views.account.tabs.billing.cancelSubscriptionModal.infoBox.free');
  }
};

export { displayAmount, getCurrentChangePlanType, getCurrentUsage, getPlanInfo, getPlanName };
