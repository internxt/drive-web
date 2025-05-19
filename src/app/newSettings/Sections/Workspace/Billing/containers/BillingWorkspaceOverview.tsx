import { t } from 'i18next';

import localStorageService from 'app/core/services/local-storage.service';
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
  const isFreeSubscription = plan.businessSubscription?.type === 'free';

  const subscriptionData: { amountInterval: string; interval: 'monthly' | 'yearly'; renewDate: string } | undefined =
    getSubscriptionData({ userSubscription: plan.businessSubscription, plan, local, userType: UserType.Business });
  const nextBillingDate = getNextBillingDate(plan.businessSubscription);
  const [integerPart, decimalPart] = subscriptionData?.amountInterval?.split('.') ?? [];

  const totalStorageInBytes =
    plan.businessPlan && bytesToString(plan.businessPlan?.storageLimit * plan.businessPlan?.amountOfSeats);
  const totalMembersPerPlan = plan.businessPlan?.amountOfSeats;
  const storagePerUserInBytes = plan.businessPlan && bytesToString(plan.businessPlan?.storageLimit);

  return (
    <section className="flex flex-row">
      {!isFreeSubscription ? (
        nextBillingDate &&
        integerPart &&
        decimalPart && (
          <div className="flex w-full flex-row gap-3">
            <Card className="w-full basis-1/2">
              <div>
                <p className="mb-0.5 text-3xl font-medium text-gray-100">{subscriptionData?.renewDate}</p>
                <p className="font-regular text-base text-gray-60">
                  {t('preferences.workspace.billing.nextBillingDate')} ({nextBillingDate})
                </p>
              </div>
            </Card>
            <Card className="w-full basis-1/2">
              <div>
                <p className="text-xl font-medium text-gray-100">
                  <span className="text-3xl">{integerPart}</span>.{decimalPart}
                </p>
                <p className="font-regular text-base text-gray-60">
                  {t('preferences.workspace.billing.planLimit', {
                    planLimit: totalStorageInBytes,
                  })}
                </p>
              </div>
            </Card>
            <Card className="w-full basis-1/2">
              <div>
                <p className="text-xl font-medium text-gray-100">
                  <span className="text-3xl">{totalMembersPerPlan}</span>{' '}
                  {t('preferences.workspace.billing.membersLabel')}
                </p>
                <p className="font-regular text-base text-gray-60">{plan.businessPlan?.name}</p>
                <p className="font-regular text-base text-gray-100">
                  {storagePerUserInBytes + ' ' + t('preferences.workspace.billing.perUser')}
                </p>
              </div>
            </Card>
          </div>
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
