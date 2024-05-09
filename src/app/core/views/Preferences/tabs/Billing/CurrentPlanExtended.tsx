import Button from 'app/shared/components/Button/Button';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import analyticsService, { trackCanceledSubscription } from '../../../../../analytics/services/analytics.service';
import { FreeStoragePlan, StoragePlan } from '../../../../../drive/types';
import { useTranslationContext } from '../../../../../i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from '../../../../../notifications/services/notifications.service';
import moneyService from '../../../../../payment/services/money.service';
import paymentService from '../../../../../payment/services/payment.service';
import { RenewalPeriod } from '../../../../../payment/types';
import Card from '../../../../../shared/components/Card';
import Spinner from '../../../../../shared/components/Spinner/Spinner';
import { RootState } from '../../../../../store';
import { useAppDispatch } from '../../../../../store/hooks';
import { PlanState, planThunks } from '../../../../../store/slices/plan';
import CurrentPlanWrapper from '../../components/CurrentPlanWrapper';
import Section from '../../components/Section';
import CancelSubscriptionModal from './CancelSubscriptionModal';

export default function CurrentPlanExtended({ className = '' }: { className?: string }): JSX.Element {
  const plan = useSelector<RootState, PlanState>((state) => state.plan);
  const [isCancelSubscriptionModalOpen, setIsCancelSubscriptionModalOpen] = useState(false);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const dispatch = useAppDispatch();
  const { translate } = useTranslationContext();

  const userSubscription = plan.subscription;

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

  async function cancelSubscription(feedback: string) {
    setCancellingSubscription(true);
    try {
      await paymentService.cancelSubscription();
      notificationsService.show({ text: translate('notificationMessages.successCancelSubscription') });
      setIsCancelSubscriptionModalOpen(false);
      trackCanceledSubscription({ feedback });
    } catch (err) {
      console.error(err);
      notificationsService.show({
        text: translate('notificationMessages.errorCancelSubscription'),
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
    return storagePlan?.simpleName || FreeStoragePlan.simpleName;
  };

  const getPlanInfo = (storagePlan: StoragePlan | null) => {
    if (storagePlan) {
      if (storagePlan.paymentInterval === RenewalPeriod.Annually) {
        return (
          moneyService.getCurrencySymbol(storagePlan.currency) +
          storagePlan.price +
          '/' +
          translate('views.account.tabs.billing.cancelSubscriptionModal.infoBox.year')
        );
      } else {
        return (
          moneyService.getCurrencySymbol(storagePlan.currency) +
          storagePlan.monthlyPrice +
          '/' +
          translate('views.account.tabs.billing.cancelSubscriptionModal.infoBox.month')
        );
      }
    } else {
      return translate('views.account.tabs.billing.cancelSubscriptionModal.infoBox.free');
    }
  };

  const getCurrentUsage = () => {
    return plan.usageDetails?.total ?? -1;
  };

  return (
    <Section className={className} title={translate('views.account.tabs.billing.currentPlan')}>
      <Card>
        {plan.planLimit && userSubscription ? (
          <>
            <CurrentPlanWrapper userSubscription={userSubscription} bytesInPlan={plan.planLimit} />
            {subscriptionExtension && (
              <div className="mt-4 flex flex-col items-center border-t border-gray-5">
                <div className="flex flex-col items-center py-4">
                  <p className="font-medium text-gray-80">
                    {translate('views.account.tabs.billing.subsRenew', {
                      daysUntilRenewal: subscriptionExtension.daysUntilRenewal,
                    })}
                  </p>
                  <p className="text-sm text-gray-50">
                    {translate('views.account.tabs.billing.billed', {
                      interval:
                        subscriptionExtension.interval === 'monthly'
                          ? translate('general.renewalPeriod.monthly')
                          : translate('general.renewalPeriod.annually'),
                      renewDate: subscriptionExtension.renewDate,
                    })}
                  </p>
                </div>

                <Button
                  variant="secondary"
                  disabled={cancellingSubscription}
                  onClick={() => {
                    analyticsService.page('Cancelation Incentive');
                    setIsCancelSubscriptionModalOpen(true);
                  }}
                >
                  {translate('views.account.tabs.billing.cancelSubscriptionModal.title')}
                </Button>

                <CancelSubscriptionModal
                  isOpen={isCancelSubscriptionModalOpen}
                  onClose={() => {
                    setIsCancelSubscriptionModalOpen(false);
                  }}
                  cancellingSubscription={cancellingSubscription}
                  cancelSubscription={cancelSubscription}
                  currentPlanName={getPlanName(plan.individualPlan || plan.teamPlan)}
                  currentPlanInfo={getPlanInfo(plan.individualPlan || plan.teamPlan)}
                  currentUsage={getCurrentUsage()}
                />
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
