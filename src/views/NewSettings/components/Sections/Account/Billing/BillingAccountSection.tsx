import { t } from 'i18next';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { paymentService } from 'views/Checkout/services';
import { RootState } from 'app/store';
import { useAppDispatch } from 'app/store/hooks';
import { PlanState, planThunks } from 'app/store/slices/plan';
import Section from '../../../Section';
import BillingPaymentMethodCard from '../../../../components/BillingPaymentMethodCard';
import Invoices from '../../../containers/InvoicesContainer';
import CancelSubscription from './components/CancelSubscription';
import BillingAccountOverview from './containers/BillingAccountOverview';
import { UserType } from '@internxt/sdk/dist/drive/payments/types/types';
import { getCurrentUsage, getPlanInfo, getPlanName } from '../../../../utils/planUtils';
import { errorService } from 'services';
import longNotificationsService from 'app/notifications/services/longNotification.service';

interface BillingAccountSectionProps {
  changeSection: ({ section, subsection }) => void;
  onClosePreferences: () => void;
}

const BillingAccountSection = ({ changeSection, onClosePreferences }: BillingAccountSectionProps) => {
  const dispatch = useAppDispatch();
  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const [isSubscription, setIsSubscription] = useState<boolean>(false);
  const [cancellingSubscription, setCancellingSubscription] = useState<boolean>(false);
  const [applyingTrial, setApplyingTrial] = useState<boolean>(false);
  const [isCancelSubscriptionModalOpen, setIsCancelSubscriptionModalOpen] = useState<boolean>(false);
  const [planName, setPlanName] = useState<string>('');
  const [planInfo, setPlanInfo] = useState<string>('');
  const [currentUsage, setCurrentUsage] = useState<number>(-1);

  useEffect(() => {
    plan.individualSubscription?.type === 'subscription' ? setIsSubscription(true) : setIsSubscription(false);

    setPlanName(getPlanName(plan.individualPlan, plan.planLimit));
    setPlanInfo(getPlanInfo(plan.individualPlan));
    setCurrentUsage(getCurrentUsage(plan.usageDetails));
  }, [plan.individualSubscription]);

  const activateTrial = async () => {
    if (plan.individualSubscription?.type !== 'subscription') return;

    setApplyingTrial(true);

    try {
      await paymentService.applyCancellationTrial(plan.individualSubscription.subscriptionId);
      longNotificationsService.show({ text: t('notificationMessages.successApplyCancellationIncentive') });
      setIsCancelSubscriptionModalOpen(false);
    } catch (error) {
      const castedError = errorService.castError(error);
      notificationsService.show({
        text: t('notificationMessages.errorApplyCancellationIncentive'),
        type: ToastType.Error,
        requestId: castedError.requestId,
      });
    } finally {
      setApplyingTrial(false);
      setTimeout(() => {
        dispatch(planThunks.initializeThunk()).unwrap();
      }, 1000);
    }
  };

  const cancelSubscription = async () => {
    setCancellingSubscription(true);
    try {
      await paymentService.cancelSubscription();
      notificationsService.show({ text: t('notificationMessages.successCancelSubscription') });
      setIsCancelSubscriptionModalOpen(false);
    } catch (err) {
      const castedError = errorService.castError(err);
      notificationsService.show({
        text: t('notificationMessages.errorCancelSubscription'),
        type: ToastType.Error,
        requestId: castedError.requestId,
      });
    } finally {
      setCancellingSubscription(false);
      setTimeout(() => {
        dispatch(planThunks.initializeThunk()).unwrap();
      }, 1000);
    }
  };

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
