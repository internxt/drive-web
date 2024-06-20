import usageService, { UsageDetailsProps } from 'app/drive/services/usage.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useEffect, useState } from 'react';

import { useSelector } from 'react-redux';
import Card from '../../../../../shared/components/Card';
import Spinner from '../../../../../shared/components/Spinner/Spinner';
import UsageDetails from '../../../../../shared/components/UsageDetails';
import { RootState } from '../../../../../store';
import { PlanState } from '../../../../../store/slices/plan';
import CurrentPlanWrapper from '../../components/CurrentPlanWrapper';
import Section from '../../components/Section';
import errorService from 'app/core/services/error.service';

export default function Usage({ className = '' }: { className?: string }): JSX.Element {
  const { translate } = useTranslationContext();
  const [planUsage, setPlanUsage] = useState<UsageDetailsProps | null>(null);
  const plan = useSelector<RootState, PlanState>((state) => state.plan);

  useEffect(() => {
    usageService
      .getUsageDetails()
      .then((usageDetails) => {
        setPlanUsage(usageDetails);
      })
      .catch((err) => {
        const error = errorService.castError(err);
        errorService.reportError(error);
      });
  }, []);

  const products: Parameters<typeof UsageDetails>[0]['products'] | null = planUsage
    ? [
        {
          name: translate('sideNav.drive'),
          usageInBytes: planUsage.drive,
          color: 'primary',
        },
        {
          name: translate('views.account.tabs.account.view.backups'),
          usageInBytes: planUsage.backups,
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
