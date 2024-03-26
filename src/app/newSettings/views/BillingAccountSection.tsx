import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { t } from 'i18next';

import { useAppDispatch } from 'app/store/hooks';
import { RootState } from 'app/store';
import { PlanState } from 'app/store/slices/plan';
import paymentService from 'app/payment/services/payment.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { trackCanceledSubscription } from 'app/analytics/services/analytics.service';
import { planThunks } from 'app/store/slices/plan';
import { FreeStoragePlan, StoragePlan } from 'app/drive/types';
import { RenewalPeriod } from 'app/payment/types';
import moneyService from 'app/payment/services/money.service';

import Section from '../../core/views/Preferences/components/Section';
import Invoices from '../containers/InvoicesContainer';
import BillingOverview from '../components/BillingOverview';
import BillingPaymentMethodCard from '../components/BillingPaymentMethodCard';
import CancelSubscription from '../components/CancelSubscription';

const BillingAccountSection = () => {
  const dispatch = useAppDispatch();
  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const [isSubscription, setIsSubscription] = useState<boolean>(false);
  const [cancellingSubscription, setCancellingSubscription] = useState<boolean>(false);
  const [isCancelSubscriptionModalOpen, setIsCancelSubscriptionModalOpen] = useState<boolean>(false);
  const [planName, setPlanName] = useState<string>('');
  const [planInfo, setPlanInfo] = useState<string>('');
  const [currentUsage, setCurrentUsage] = useState<number>(-1);

  useEffect(() => {
    plan.subscription?.type === 'subscription' ? setIsSubscription(true) : setIsSubscription(false);
    getPlanName(plan.individualPlan || plan.teamPlan);
    getPlanInfo(plan.individualPlan || plan.teamPlan);
    getCurrentUsage();
  }, [plan]);

  async function cancelSubscription(feedback: string) {
    setCancellingSubscription(true);
    try {
      await paymentService.cancelSubscription();
      notificationsService.show({ text: t('notificationMessages.successCancelSubscription') });
      setIsCancelSubscriptionModalOpen(false);
      trackCanceledSubscription({ feedback });
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

  const getPlanName = (storagePlan: StoragePlan | null) => {
    setPlanName(storagePlan?.simpleName || FreeStoragePlan.simpleName);
  };

  const getPlanInfo = (storagePlan: StoragePlan | null) => {
    if (storagePlan) {
      if (storagePlan.paymentInterval === RenewalPeriod.Annually) {
        setPlanInfo(
          moneyService.getCurrencySymbol(storagePlan.currency) +
            storagePlan.price +
            '/' +
            t('views.account.tabs.billing.cancelSubscriptionModal.infoBox.year'),
        );
      } else {
        setPlanInfo(
          moneyService.getCurrencySymbol(storagePlan.currency) +
            storagePlan.monthlyPrice +
            '/' +
            t('views.account.tabs.billing.cancelSubscriptionModal.infoBox.month'),
        );
      }
    } else {
      setPlanInfo(`${t('views.account.tabs.billing.cancelSubscriptionModal.infoBox.free')}`);
    }
  };

  const getCurrentUsage = () => {
    setCurrentUsage(plan.usageDetails?.total || -1);
  };

  return (
    <Section
      title={t('preferences.workspace.billing.title')}
      className="flex max-h-640 flex-1 flex-col space-y-6 overflow-y-auto p-6"
    >
      <BillingOverview plan={plan} />
      <BillingPaymentMethodCard />
      <Invoices />
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
