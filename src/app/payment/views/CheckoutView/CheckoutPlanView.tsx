import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { useSelector } from 'react-redux';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import paymentService from 'app/payment/services/payment.service';
import { RootState } from 'app/store';
import { useAppDispatch } from 'app/store/hooks';
import { planActions, PlanState } from 'app/store/slices/plan';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import { useEffect } from 'react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

interface CheckoutOptions {
  price_id: string;
  coupon_code?: string;
  trial_days?: number;
  success_url: string;
  cancel_url: string;
  customer_email: string;
  mode: string | undefined;
}

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
      const freeTrials = Number(params.get('freeTrials'));
      checkout(planId, coupon, mode, freeTrials);
    }
  }, [subscription]);

  async function checkout(planId: string, coupon?: string, mode?: string, freeTrials?: number) {
    let response;
    const checkoutOptions: CheckoutOptions = {
      price_id: planId,
      success_url: `${window.location.origin}/checkout/success`,
      cancel_url: 'https://drive.internxt.com/preferences?tab=plans',
      customer_email: user.email,
      mode: mode,
    };

    if (subscription?.type !== 'subscription') {
      try {
        if (coupon && freeTrials) {
          checkoutOptions.coupon_code = coupon;
          checkoutOptions.trial_days = freeTrials;
        } else if (coupon) {
          checkoutOptions.coupon_code = coupon;
        }

        response = await paymentService.createCheckoutSession(checkoutOptions);
        localStorage.setItem('sessionId', response.sessionId);

        await paymentService.redirectToCheckout(response);
      } catch (err) {
        console.error(err);
        notificationsService.show({
          text: translate('notificationMessages.errorCancelSubscription'),
          type: ToastType.Error,
        });
      }
    } else {
      if (mode === 'payment') {
        try {
          if (coupon) {
            checkoutOptions.coupon_code = coupon;
          }
          response = await paymentService.createCheckoutSession(checkoutOptions);
          localStorage.setItem('sessionId', response.sessionId);
          await paymentService.redirectToCheckout(response).then(async (result) => {
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
          navigationService.push(AppView.Preferences);
        } catch (err) {
          console.error(err);
          notificationsService.show({
            text: translate('notificationMessages.errorCancelSubscription'),
            type: ToastType.Error,
          });
        }
      }
    }
  }

  return <></>;
}
