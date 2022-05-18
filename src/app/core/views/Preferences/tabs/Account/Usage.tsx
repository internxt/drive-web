import { useSelector } from 'react-redux';
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

  return (
    <Section className={className} title="Usage">
      <Card>
        {products && plan.individualPlan ? (
          <>
            <CurrentPlan button="upgrade" bytesInPlan={plan.planLimit} planName={plan.individualPlan.name} />
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
