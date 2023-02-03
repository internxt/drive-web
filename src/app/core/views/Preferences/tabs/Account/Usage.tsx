import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useTranslation } from 'react-i18next';

import { useSelector } from 'react-redux';
import Card from '../../../../../shared/components/Card';
import Spinner from '../../../../../shared/components/Spinner/Spinner';
import UsageDetails from '../../../../../shared/components/UsageDetails';
import { RootState } from '../../../../../store';
import { PlanState } from '../../../../../store/slices/plan';
import CurrentPlanWrapper from '../../components/CurrentPlanWrapper';
import Section from '../../components/Section';

export default function Usage({ className = '' }: { className?: string }): JSX.Element {
  const { translate } = useTranslationContext();

  const plan = useSelector<RootState, PlanState>((state) => state.plan);

  const products: Parameters<typeof UsageDetails>[0]['products'] | null = plan.usageDetails
    ? [
        { name: 'Drive', usageInBytes: plan.usageDetails.drive, color: 'primary' },
        {
          name: translate('views.account.tabs.account.view.backups'),
          usageInBytes: plan.usageDetails.backups,
          color: 'indigo',
        },
      ]
    : null;

  const userSubscription = plan.subscription;

  return (
    <Section className={className} title={translate('drive.usage')}>
      <Card>
        {products && plan.planLimit && userSubscription ? (
          <>
            <CurrentPlanWrapper bytesInPlan={plan.planLimit} userSubscription={userSubscription} />
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
