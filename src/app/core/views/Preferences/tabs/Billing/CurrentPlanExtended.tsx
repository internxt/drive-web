import { UserSubscription } from '@internxt/sdk/dist/drive/payments/types';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import paymentService from '../../../../../payment/services/payment.service';
import Card from '../../../../../shared/components/Card';
import Spinner from '../../../../../shared/components/Spinner/Spinner';
import { RootState } from '../../../../../store';
import { PlanState } from '../../../../../store/slices/plan';
import CurrentPlanWrapper from '../../components/CurrentPlanWrapper';
import Section from '../../components/Section';

export default function CurrentPlanExtended({ className = '' }: { className?: string }): JSX.Element {
  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  useEffect(() => {
    paymentService.getUserSubscription().then(setUserSubscription);
  }, []);

  let subscriptionExtension:
    | { daysUntilRenewal: string; interval: 'monthly' | 'yearly'; renewDate: string }
    | undefined;

  if (userSubscription?.type === 'subscription') {
    const nextPayment = new Date(userSubscription.nextPayment * 1000);

    const renewDate = Intl.DateTimeFormat(undefined, { dateStyle: 'short' }).format(nextPayment);

    const interval = userSubscription.interval === 'month' ? 'monthly' : 'yearly';

    const daysUntilRenewal = ((nextPayment.valueOf() - new Date().valueOf()) / (1000 * 3600 * 24)).toFixed(0);

    subscriptionExtension = { daysUntilRenewal, interval, renewDate };
  }

  return (
    <Section className={className} title="Current plan">
      <Card>
        {plan.planLimit && userSubscription ? (
          <>
            <CurrentPlanWrapper userSubscription={userSubscription} bytesInPlan={plan.planLimit} />
            {subscriptionExtension && (
              <div className="mt-4 flex flex-col items-center border-t border-gray-5">
                <h1 className="mt-4 font-medium text-gray-80">
                  Subscription renews in {subscriptionExtension.daysUntilRenewal} days
                </h1>
                <p className="text-xs text-gray-50">
                  Billed {subscriptionExtension.interval} {subscriptionExtension.renewDate}
                </p>
                <button className="mt-2 text-xs text-gray-60">Cancel subscription</button>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center" style={{ height: '122px' }}>
            <Spinner className="h-7 w-7 text-primary" />
          </div>
        )}
      </Card>
    </Section>
  );
}
