import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { useSelector } from 'react-redux';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import paymentService from 'app/payment/services/payment.service';
import { RootState } from 'app/store';
import { useAppDispatch } from 'app/store/hooks';
import { planActions, PlanState, planThunks } from 'app/store/slices/plan';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import { useEffect } from 'react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

export default function CheckoutPlanView(): JSX.Element {
  const dispatch = useAppDispatch();
  const { translate } = useTranslationContext();

  const plan = useSelector((state: RootState) => state.plan) as PlanState;
  const user = useSelector((state: RootState) => state.user.user) as UserSettings;
  if (user === undefined) {
    navigationService.push(AppView.Login);
  }
  const { subscription } = plan;

  useEffect(() => {
    if (subscription) {
      const params = new URLSearchParams(window.location.search);
      const planId = String(params.get('planId'));
      const coupon = String(params.get('couponCode'));
      const mode = String(params.get('mode') as string | undefined);

      checkout(planId, coupon, mode);
    }
  }, [subscription]);

  async function checkout(planId: string, coupon?: string, mode?: string) {
    if (plan.subscription?.type === 'subscription') {
      if (mode === 'payment') {
        try {
          const response = await paymentService.createCheckoutSession({
            price_id: planId,
            success_url: `${window.location.origin}/checkout/success`,
            cancel_url: `${window.location.origin}/checkout/cancel?price_id=${planId}`,
            customer_email: user.email,
            mode: 'payment',
          });
          localStorage.setItem('sessionId', response.sessionId);

          await paymentService.redirectToCheckout({ sessionId: response.id }).then(async (result) => {
            await paymentService.cancelSubscription();
            if (result.error) {
              notificationsService.show({
                type: ToastType.Error,
                text: result.error.message as string,
              });
            } else {
              notificationsService.show({
                type: ToastType.Success,
                text: 'Payment successful',
              });
            }
          });
        } catch (error) {
          console.error(error);
          notificationsService.show({
            text: translate('notificationMessages.errorCancelSubscription'),
            type: ToastType.Error,
          });
        }
      } else {
        try {
          const updatedSubscription = await paymentService.updateSubscriptionPrice(planId);
          dispatch(planActions.setSubscription(updatedSubscription));
          dispatch(planThunks.initializeThunk());
          notificationsService.show({ text: 'Subscription updated successfully', type: ToastType.Success });
          navigationService.push(AppView.Drive);
        } catch (err) {
          console.error(err);
          notificationsService.show({
            text: translate('notificationMessages.errorCancelSubscription'),
            type: ToastType.Error,
          });
        }
      }
    } else if (subscription?.type === 'free') {
      const couponCode = coupon ? coupon : undefined;
      navigationService.push(AppView.PaymentMethod, { priceId: planId, coupon: couponCode });
    }
  }

  return <></>;
}
