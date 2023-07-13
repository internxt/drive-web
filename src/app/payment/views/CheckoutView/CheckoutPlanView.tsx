import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { useSelector } from 'react-redux';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import paymentService from 'app/payment/services/payment.service';
import { RootState } from 'app/store';
import { useAppDispatch } from 'app/store/hooks';
import { planActions, planThunks } from 'app/store/slices/plan';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import { useEffect } from 'react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

export default function CheckoutPlanView(): JSX.Element {
  const dispatch = useAppDispatch();
  const { translate } = useTranslationContext();

  const plan = useSelector((state: RootState) => state.plan);
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
      const discount = Number(params.get('discount') as string | undefined);
      checkout(planId, coupon, mode, discount);
    }
  }, [subscription]);

  async function checkout(planId: string, coupon?: string, mode?: string, discount?: number) {
    const couponCode = coupon !== 'null' ? { coupon_code: coupon } : undefined;
    const isFreePlan = subscription?.type === 'free';
    const isSubscription = subscription?.type === 'subscription';
    const isLifetimePlan = subscription?.type === 'lifetime';
    const isOneTimePayment = mode === 'payment';

    if (isSubscription) {
      if (isOneTimePayment) {
        try {
          const { sessionId } = await paymentService.createCheckoutSession({
            price_id: planId,
            success_url: `${window.location.origin}/checkout/success`,
            cancel_url: `${window.location.origin}/checkout/cancel?price_id=${planId}`,
            customer_email: user.email,
            mode: 'payment',
            ...couponCode,
          });
          localStorage.setItem('sessionId', sessionId);

          await paymentService.redirectToCheckout({ sessionId }).then(async (result) => {
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
    } else if (isFreePlan && isOneTimePayment) {
      const { sessionId } = await paymentService.createCheckoutSession({
        price_id: planId,
        success_url: `${window.location.origin}/checkout/success`,
        cancel_url: `${window.location.origin}/checkout/cancel?price_id=${planId}`,
        customer_email: user.email,
        mode: 'payment',
        ...couponCode,
      });
      localStorage.setItem('sessionId', sessionId);

      await paymentService.redirectToCheckout({ sessionId: sessionId }).then(async (result) => {
        await paymentService.cancelSubscription();
        if (result.error) {
          notificationsService.show({
            type: ToastType.Error,
            text: result.error.message as string,
          });
        }
      });
    } else if (isLifetimePlan) {
      notificationsService.show({
        type: ToastType.Info,
        text: 'You already have a lifetime subscription',
      });
      navigationService.push(AppView.Drive);
    } else {
      navigationService.push(AppView.PaymentMethod, { priceId: planId, discount: discount, ...couponCode });
    }
  }

  return <></>;
}
