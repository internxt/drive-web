import { DisplayPrice, RenewalPeriod, StoragePlan, UserSubscription } from '@internxt/sdk/dist/drive/payments/types';
import { UsageResponse } from '@internxt/sdk/dist/drive/storage/types';
import { bytesToString } from 'app/drive/services/size.service';
import { t } from 'i18next';
import { FreeStoragePlan } from '../../../../../drive/types';
import moneyService from '../../../../../payment/services/currency.service';
import { ChangePlanType } from '../components/PlanCard';

function displayAmount(value: number, decimalPoints = 2) {
  return (value / 100).toFixed(decimalPoints);
}

const determineSubscriptionChangeType = ({
  priceSelected,
  currentUserSubscription,
  planLimit,
  isFreePriceSelected,
  currentPlanRenewalInterval,
}: {
  priceSelected: DisplayPrice;
  currentUserSubscription: UserSubscription | null;
  planLimit: number | null;
  isFreePriceSelected: boolean;
  currentPlanRenewalInterval: DisplayPrice['interval'] | null;
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
      return getPlanChangeType(currentPlanRenewalInterval, priceSelected?.interval);
    }

    return 'free';
  }

  return 'free';
};

/**
 * Returns the type of plan change based on the current and selected intervals.
 *
 * @param {string} currentPlanRenewalInterval - The current plan renewal interval.
 * @param {string} selectedInterval - The selected interval.
 * @return {string} The type of plan change ('manage billing', 'downgrade', or 'upgrade').
 */
function getPlanChangeType(currentPlanRenewalInterval, selectedInterval) {
  const intervals = ['month', 'year', 'lifetime'];

  const currentIndex = intervals.indexOf(currentPlanRenewalInterval);
  const selectedIndex = intervals.indexOf(selectedInterval);

  if (currentIndex === selectedIndex) {
    return 'manageBilling';
  } else if (selectedIndex < currentIndex) {
    return 'downgrade';
  } else {
    return 'upgrade';
  }
}

const getPlanName = (storagePlan: StoragePlan | null, limit?: number) => {
  if (storagePlan?.simpleName) return storagePlan?.simpleName;
  if (limit) return bytesToString(limit, false);
  return FreeStoragePlan.simpleName;
};
const getCurrentUsage = (usage: UsageResponse | null) => {
  return usage?.total ?? -1;
};

const getRenewalPeriod = (interval?: RenewalPeriod): DisplayPrice['interval'] | null => {
  if (!interval) return null;

  const mapping: { [key: string]: DisplayPrice['interval'] } = {
    monthly: 'month',
    annually: 'year',
    lifetime: 'lifetime',
  };
  return mapping[interval.toLowerCase()] ?? null;
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

export { determineSubscriptionChangeType, displayAmount, getCurrentUsage, getPlanInfo, getPlanName, getRenewalPeriod };
