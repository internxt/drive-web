import { t } from 'i18next';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import notificationsService, { ToastType } from '../../../../notifications/services/notifications.service';
import paymentService from '../../../../payment/services/payment.service';
import { RootState } from '../../../../store';
import { useAppDispatch } from '../../../../store/hooks';
import { PlanState, planThunks } from '../../../../store/slices/plan';
import Section from 'app/newSettings/components/Section';
import BillingPaymentMethodCard from '../../../components/BillingPaymentMethodCard';
import Invoices from '../../../containers/InvoicesContainer';
import CancelSubscription from './components/CancelSubscription';
import BillingAccountOverview from './containers/BillingAccountOverview';
import { UserType } from '@internxt/sdk/dist/drive/payments/types';
import { getCurrentUsage, getPlanInfo, getPlanName } from '../Plans/utils/planUtils';

interface BillingAccountSectionProps {
  changeSection: ({ section, subsection }) => void;
  onClosePreferences: () => void;
}

const BillingAccountSection = ({ changeSection, onClosePreferences }: BillingAccountSectionProps) => {
  const dispatch = useAppDispatch();
  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const [isSubscription, setIsSubscription] = useState<boolean>(false);
  const [cancellingSubscription, setCancellingSubscription] = useState<boolean>(false);
  const [isCancelSubscriptionModalOpen, setIsCancelSubscriptionModalOpen] = useState<boolean>(false);
  const [planName, setPlanName] = useState<string>('');
  const [planInfo, setPlanInfo] = useState<string>('');
  const [currentUsage, setCurrentUsage] = useState<number>(-1);

  useEffect(() => {
    plan.individualSubscription?.type === 'subscription' ? setIsSubscription(true) : setIsSubscription(false);

    setPlanName(getPlanName(plan.individualPlan || plan.teamPlan, plan.planLimit));
    setPlanInfo(getPlanInfo(plan.individualPlan || plan.teamPlan));
    setCurrentUsage(getCurrentUsage(plan.usageDetails));
  }, [plan.individualSubscription]);

  async function cancelSubscription() {
    setCancellingSubscription(true);
    try {
      await paymentService.cancelSubscription();
      notificationsService.show({ text: t('notificationMessages.successCancelSubscription') });
      setIsCancelSubscriptionModalOpen(false);
    } catch (err) {
      console.error(err);
      notificationsService.show({
        text: t('notificationMessages.errorCancelSubscription'),
        type: ToastType.Error,
      });
    } finally {
      setCancellingSubscription(false);
      setTimeout(() => {
        dispatch(planThunks.initializeThunk()).unwrap();
      }, 1000);
    }
  }

  return (
    <Section title={t('preferences.workspace.billing.title')} onClosePreferences={onClosePreferences}>
      <BillingAccountOverview plan={plan} changeSection={changeSection} />
      <BillingPaymentMethodCard subscription={plan.individualSubscription?.type} userType={UserType.Individual} />
      <Invoices userType={UserType.Individual} />
      {isSubscription && (
        <CancelSubscription
          isCancelSubscriptionModalOpen={isCancelSubscriptionModalOpen}
          setIsCancelSubscriptionModalOpen={setIsCancelSubscriptionModalOpen}
          cancellingSubscription={cancellingSubscription}
          cancelSubscription={cancelSubscription}
          planName={planName}
          planInfo={planInfo}
          currentUsage={currentUsage}
        />
      )}
    </Section>
  );
};

export default BillingAccountSection;
