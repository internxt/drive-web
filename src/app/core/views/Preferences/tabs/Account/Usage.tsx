import { UserSubscription } from '@internxt/sdk/dist/drive/payments/types';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import paymentService from '../../../../../payment/services/payment.service';
import Card from '../../../../../shared/components/Card';
import CurrentPlan from '../../../../../shared/components/CurrentPlan';
import Spinner from '../../../../../shared/components/Spinner/Spinner';
import UsageDetails from '../../../../../shared/components/UsageDetails';
import { RootState } from '../../../../../store';
import { PlanState } from '../../../../../store/slices/plan';
import Section from '../../components/Section';

export default function Usage({ className = '' }: { className?: string }): JSX.Element {
  const plan = useSelector<RootState, PlanState>((state) => state.plan);

  const products: Parameters<typeof UsageDetails>[0]['products'] | null = plan.usageDetails
    ? [
        { name: 'Drive', usageInBytes: plan.usageDetails.drive, color: 'primary' },
        { name: 'Backups', usageInBytes: plan.usageDetails.backups, color: 'indigo' },
      ]
    : null;

  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);

  useEffect(() => {
    paymentService.getUserSubscription().then(setUserSubscription);
  }, []);

  let planName = '';
  let button: 'upgrade' | 'change' | undefined;

  switch (userSubscription?.type) {
    case 'free':
      planName = 'Free plan';
      button = 'upgrade';
      break;
    case 'lifetime':
      planName = 'Lifetime';
      button = undefined;
      break;
    case 'subscription':
      planName = 'Subscription';
      button = 'change';
      break;
  }

  return (
    <Section className={className} title="Usage">
      <Card>
        {products && plan.planLimit && planName ? (
          <>
            <CurrentPlan button={button} bytesInPlan={plan.planLimit} planName={planName} />
            <UsageDetails className="mt-5" planLimitInBytes={plan.planLimit} products={products} />
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
