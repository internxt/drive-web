import { t } from 'i18next';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'app/store';
import { PlanState } from 'app/store/slices/plan';
import Section from '../../../Section';
import BillingPaymentMethodCard from '../../../../components/BillingPaymentMethodCard';
import Invoices from '../../../containers/InvoicesContainer';
import CancelSubscription from './components/CancelSubscription';
import BillingAccountOverview from './containers/BillingAccountOverview';
import { UserType } from '@internxt/sdk/dist/drive/payments/types/types';
import { getCurrentUsage, getPlanInfo, getPlanName } from '../../../../utils/planUtils';
import { useSubscriptionCancellation } from '../../../../hooks';

interface BillingAccountSectionProps {
  changeSection: ({ section, subsection }) => void;
  onClosePreferences: () => void;
}

const BillingAccountSection = ({ changeSection, onClosePreferences }: BillingAccountSectionProps) => {
  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const [isSubscription, setIsSubscription] = useState<boolean>(false);
  const [isCancelSubscriptionModalOpen, setIsCancelSubscriptionModalOpen] = useState<boolean>(false);
  const [planName, setPlanName] = useState<string>('');
  const [planInfo, setPlanInfo] = useState<string>('');
  const [currentUsage, setCurrentUsage] = useState<number>(-1);

  const { cancellingSubscription, applyingTrial, cancelSubscription, activateTrial } = useSubscriptionCancellation({
    individualSubscription: plan.individualSubscription,
    onModalClose: () => setIsCancelSubscriptionModalOpen(false),
  });

  useEffect(() => {
    plan.individualSubscription?.type === 'subscription' ? setIsSubscription(true) : setIsSubscription(false);

    setPlanName(getPlanName(plan.individualPlan, plan.planLimit));
    setPlanInfo(getPlanInfo(plan.individualPlan));
    setCurrentUsage(getCurrentUsage(plan.usageDetails));
  }, [plan.individualSubscription]);

  return (
    <Section title={t('preferences.workspace.billing.title')} onClosePreferences={onClosePreferences}>
      <BillingAccountOverview plan={plan} changeSection={changeSection} />
      <BillingPaymentMethodCard subscription={plan.individualSubscription?.type} userType={UserType.Individual} />
      <Invoices userType={UserType.Individual} />
      {isSubscription && (
        <CancelSubscription
          individualPlan={plan.individualPlan}
          isCancelSubscriptionModalOpen={isCancelSubscriptionModalOpen}
          cancellingSubscription={cancellingSubscription}
          planName={planName}
          planInfo={planInfo}
          currentUsage={currentUsage}
          applyingTrial={applyingTrial}
          activateTrial={activateTrial}
          cancelSubscription={cancelSubscription}
          setIsCancelSubscriptionModalOpen={setIsCancelSubscriptionModalOpen}
        />
      )}
    </Section>
  );
};

export default BillingAccountSection;
