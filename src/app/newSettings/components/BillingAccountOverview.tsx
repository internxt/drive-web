import { t } from 'i18next';

import { getSubscriptionData, getNextBillingDate } from '../utils/suscriptionUtils';
import localStorageService from 'app/core/services/local-storage.service';
import navigationService from 'app/core/services/navigation.service';
import { bytesToString } from '../../drive/services/size.service';

import Card from 'app/shared/components/Card';

import { PlanState } from 'app/store/slices/plan';
import Button from 'app/shared/components/Button/Button';

interface BillingAccountOverviewProps {
  plan: PlanState;
  changeSection: ({ section, subsection }) => void;
}

const BillingAccountOverview = ({ plan, changeSection }: BillingAccountOverviewProps) => {
  const local = localStorageService.get('i18nextLng') ?? navigator.language.split('-')[0];
  const isSubscription = plan.subscription?.type === 'subscription';
  const isFreeSubscription = plan.subscription?.type === 'free';
  const isLifetimeSubscription = plan.subscription?.type === 'lifetime';

  const subscriptionData: { amountInterval: string; interval: 'monthly' | 'yearly'; renewDate: string } | undefined =
    getSubscriptionData({ userSubscription: plan.subscription, plan, local });
  const nextBillingDate = getNextBillingDate(plan.subscription);

  return (
    <section className="flex flex-row">
      <Card className="mr-3 flex basis-56">
        <div>
          <p className="text-3xl font-medium text-gray-100">{bytesToString(plan.planLimit, false)}</p>
          <p className="font-regular text-base text-gray-60">
            {isSubscription && <span>{subscriptionData?.amountInterval}</span>}
            {isLifetimeSubscription && <span>{t('preferences.workspace.billing.lifetimeSubscription.planType')}</span>}
            {isFreeSubscription && <span>{t('preferences.workspace.billing.freeSubscription.planType')}</span>}
          </p>
        </div>
      </Card>
      <Card className="ml-3 basis-full">
        {isSubscription && (
          <div>
            <p className="mb-0.5 text-3xl font-medium text-gray-100">{subscriptionData?.renewDate}</p>
            <p className="font-regular text-base text-gray-60">
              {t('preferences.workspace.billing.nextBillingDate')} ({nextBillingDate})
            </p>
          </div>
        )}
        {isLifetimeSubscription && (
          <div className="flex h-full flex-col justify-end">
            <hr className="mb-4 h-0.5 w-8 border-0 bg-gray-100" />
            <p className="font-regular text-base text-gray-60">
              {t('preferences.workspace.billing.lifetimeSubscription.text')}
            </p>
          </div>
        )}
        {isFreeSubscription && (
          <div className="flex flex-row">
            <div className="mr-8">
              <p className="font-regular text-base text-gray-100">
                {t('preferences.workspace.billing.freeSubscription.action')}
              </p>
              <p className="font-regular mt-1 text-sm text-gray-60">
                {t('preferences.workspace.billing.freeSubscription.actionDescription')}
              </p>
            </div>
            <div className="flex flex-col-reverse">
              <Button
                variant="primary"
                onClick={() => {
                  navigationService.openPreferencesDialog({ section: 'account', subsection: 'plans' });
                  changeSection({ section: 'account', subsection: 'plans' });
                }}
              >
                {t('preferences.workspace.billing.freeSubscription.action')}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
};

export default BillingAccountOverview;
