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

export default function CheckoutPlanView(): JSX.Element {
  const dispatch = useAppDispatch();

  console.log('CHECKOUT VISITED');

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
    let response;

    if (subscription?.type !== 'subscription') {
      try {
        coupon !== 'null'
          ? (response = await paymentService.createCheckoutSession({
              price_id: planId,
              coupon_code: coupon,
              success_url: `${window.location.origin}/checkout/success`,
              cancel_url: 'https://drive.internxt.com/preferences?tab=plans',
              customer_email: user.email,
              mode: mode,
            }))
          : (response = await paymentService.createCheckoutSession({
              price_id: planId,
              success_url: `${window.location.origin}/checkout/success`,
              cancel_url: 'https://drive.internxt.com/preferences?tab=plans',
              customer_email: user.email,
              mode: mode,
            }));
        localStorage.setItem('sessionId', response.sessionId);

        await paymentService.redirectToCheckout(response);
      } catch (err) {
        console.error(err);
        notificationsService.show({
          text: 'Something went wrong while creating your subscription',
          type: ToastType.Error,
        });
      }
    } else {
      try {
        const updatedSubscription = await paymentService.updateSubscriptionPrice(planId);
        navigationService.push(AppView.Preferences);
        dispatch(planActions.setSubscription(updatedSubscription));
      } catch (err) {
        console.error(err);
        notificationsService.show({
          text: 'Something went wrong while updating your subscription',
          type: ToastType.Error,
        });
      }
    }
  }

  return <></>;
}
