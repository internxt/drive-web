import { t } from 'i18next';

import localStorageService from '../../../../../core/services/local-storage.service';
import { bytesToString } from '../../../../../drive/services/size.service';

import Card from 'app/shared/components/Card';

import { UserType } from '@internxt/sdk/dist/drive/payments/types';
import { PlanState } from 'app/store/slices/plan';
import { getNextBillingDate, getSubscriptionData } from '../../../../utils/suscriptionUtils';

interface BillingWorkspaceOverviewProps {
  plan: PlanState;
}

const BillingWorkspaceOverview = ({ plan }: BillingWorkspaceOverviewProps) => {
  const local = localStorageService.get('i18nextLng') ?? navigator.language.split('-')[0];
  const isFreeSuscription = plan.businessSubscription?.type === 'free';

  const subscriptionData: { amountInterval: string; interval: 'monthly' | 'yearly'; renewDate: string } | undefined =
    getSubscriptionData({ userSubscription: plan.businessSubscription, plan, local, userType: UserType.Business });
  const nextBillingDate = getNextBillingDate(plan.businessSubscription);
  const [integerPart, decimalPart] = subscriptionData?.amountInterval?.split('.') ?? [];

  return (
    <section className="flex flex-row">
      {!isFreeSuscription ? (
        nextBillingDate &&
        integerPart &&
        decimalPart && (
          <>
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
                  {t('preferences.workspace.billing.planLimit', { planLimit: bytesToString(plan.businessPlanLimit) })}
                </p>
              </div>
            </Card>
          </>
        )
      ) : (
        <Card className="w-full text-center">
          <h1 className="font-medium text-gray-60">
            {t('preferences.workspace.billing.paymentMethod.freePlanTitle', {
              planLimit: bytesToString(plan.businessPlanLimit),
            })}
          </h1>
        </Card>
      )}
    </section>
  );
};

export default BillingWorkspaceOverview;
