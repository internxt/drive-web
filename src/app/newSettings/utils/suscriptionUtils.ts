import { UserSubscription } from '@internxt/sdk/dist/drive/payments/types';
import dateService from 'app/core/services/date.service';
import { t } from 'i18next';
import { StoragePlan } from '../../drive/types';
import moneyService from '../../payment/services/money.service';
import { RenewalPeriod } from '../../payment/types';
import { PlanState } from '../../store/slices/plan';

const formatPlanPaymentInterval = (storagePlan: StoragePlan | null) => {
  if (storagePlan) {
    const isAnuallyPaymentInterval = storagePlan.paymentInterval === RenewalPeriod.Annually;
    const price = isAnuallyPaymentInterval ? storagePlan.price : storagePlan.monthlyPrice;
    const renewalPeriod = isAnuallyPaymentInterval ? 'year' : 'month';

    return (
      price +
      moneyService.getCurrencySymbol(storagePlan.currency) +
      '/' +
      t(`views.account.tabs.billing.cancelSubscriptionModal.infoBox.${renewalPeriod}`)
    );
  } else {
    return t('views.account.tabs.billing.cancelSubscriptionModal.infoBox.free');
  }
};

const getSubscriptionData = ({
  userSubscription,
  plan,
  local,
}: {
  userSubscription: UserSubscription | null;
  plan: PlanState;
  local: string;
}): { amountInterval: string; interval: 'monthly' | 'yearly'; renewDate: string } | undefined => {
  if (userSubscription?.type === 'subscription') {
    const nextPayment = new Date(userSubscription.nextPayment * 1000);
    const renewDate = new Intl.DateTimeFormat(local, {
      month: 'long',
      day: 'numeric',
    }).format(nextPayment);
    const interval = userSubscription.interval === 'month' ? 'monthly' : 'yearly';

    const amountInterval = formatPlanPaymentInterval(plan.individualPlan ?? plan.teamPlan);

    return { amountInterval, interval, renewDate };
  }

  return undefined;
};

const getNextBillingDate = (userSubscription: UserSubscription | null) => {
  let nextBillingDate;
  if (userSubscription?.type === 'subscription') {
    const nextPayment = new Date(userSubscription.nextPayment * 1000);
    nextBillingDate = dateService.format(nextPayment, 'DD/MM/YY');
  }
  return nextBillingDate;
};

export { formatPlanPaymentInterval, getNextBillingDate, getSubscriptionData };
