import { useSelector } from 'react-redux';
import { t } from 'i18next';

import { RootState } from 'app/store';
import { PlanState } from 'app/store/slices/plan';
import { getSubscriptionData, getNextBillingDate } from '../utils/suscriptionUtils';
import localStorageService from 'app/core/services/local-storage.service';
import { bytesToString } from '../../drive/services/size.service';

import Card from 'app/shared/components/Card';

const BillingOverview = () => {
  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const local = localStorageService.get('i18nextLng') ?? navigator.language.split('-')[0];

  const subscriptionData: { amountInterval: string; interval: 'monthly' | 'yearly'; renewDate: string } | undefined =
    getSubscriptionData({ userSubscription: plan.subscription, plan, local });
  const nextBillingDate = getNextBillingDate(plan.subscription);
  const [integerPart, decimalPart] = subscriptionData?.amountInterval?.split('.') ?? [];

  return (
    <section className="flex flex-row">
      <Card className="mr-3 basis-1/2">
        <div>
          <p className="mb-0.5 text-3xl font-medium text-gray-100">{subscriptionData?.renewDate}</p>
          <p className="font-regular text-base text-gray-60">
            {t('preferences.workspace.billing.nextBillingDate')} ({nextBillingDate})
          </p>
        </div>
      </Card>
      <Card className="ml-3 basis-1/2">
        <div>
          <p className="text-xl font-medium text-gray-100">
            <span className="text-3xl">{integerPart}</span>.{decimalPart}
          </p>
          <p className="font-regular text-base text-gray-60">
            {t('preferences.workspace.billing.planLimit', { planLimit: bytesToString(plan.planLimit) })}
          </p>
        </div>
      </Card>
    </section>
  );
};

export default BillingOverview;
