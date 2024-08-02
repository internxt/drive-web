import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import paymentService from 'app/payment/services/payment.service';
import { RootState } from 'app/store';
import { useAppDispatch } from 'app/store/hooks';
import { planActions, PlanState } from 'app/store/slices/plan';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { UserType } from '@internxt/sdk/dist/drive/payments/types';

interface CheckoutOptions {
  price_id: string;
  coupon_code?: string;
  trial_days?: number;
  success_url: string;
  cancel_url: string;
  customer_email: string;
  mode: string | undefined;
  currency: string;
}

export default function CheckoutPlanView(): JSX.Element {
  const dispatch = useAppDispatch();
  const { translate } = useTranslationContext();

  const plan = useSelector((state: RootState) => state.plan) as PlanState;
  const user = useSelector((state: RootState) => state.user.user) as UserSettings;
  if (user === undefined) {
    navigationService.push(AppView.Login);
  }
  const { individualSubscription, businessSubscription } = plan;
  const workspace = useSelector((state: RootState) => state.workspaces.selectedWorkspace);
  const subscription = !workspace ? individualSubscription : businessSubscription;

  useEffect(() => {
    if (subscription) {
      const params = new URLSearchParams(window.location.search);
      const planId = String(params.get('planId'));
      const coupon = String(params.get('couponCode'));
      const mode = String(params.get('mode') as string | undefined);
      const freeTrials = Number(params.get('freeTrials'));
      const currency = String(params.get('currency'));
      checkout(planId, currency, coupon, mode, freeTrials);
    }
  }, [subscription]);

  async function checkout(planId: string, currency: string, coupon?: string, mode?: string, freeTrials?: number) {
    let response;

    const checkoutOptions: CheckoutOptions = {
      price_id: planId,
      success_url: `${window.location.origin}/checkout/success`,
      cancel_url: `${window.location.origin}/checkout/cancel`,
      customer_email: user.email,
      mode: mode,
      currency,
    };

    if (subscription?.type !== 'subscription') {
      try {
        if (coupon && freeTrials) {
          checkoutOptions.coupon_code = coupon;
          checkoutOptions.trial_days = freeTrials;
        } else if (coupon !== 'null') {
          checkoutOptions.coupon_code = coupon;
        }

        // Comment this push and uncomment the code below in case the integrated checkout does not work.
        navigationService.push(AppView.Checkout, {
          planId: planId,
          couponCode: coupon,
        });

        // response = await paymentService.createCheckoutSession(checkoutOptions);
        // localStorage.setItem('sessionId', response.sessionId);

        // await paymentService.redirectToCheckout(response);
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
          if (coupon && coupon !== 'null') {
            checkoutOptions.coupon_code = coupon;
          }
          // Comment this push and uncomment the code below in case the integrated checkout does not work.
          navigationService.push(AppView.Checkout, {
            planId: planId,
            couponCode: coupon,
          });

          // response = await paymentService.createCheckoutSession(checkoutOptions);
          // localStorage.setItem('sessionId', response.sessionId);
          // await paymentService.redirectToCheckout(response).then(async (result) => {
          //   await paymentService.cancelSubscription();
          //   if (result.error) {
          //     notificationsService.show({
          //       type: ToastType.Error,
          //       text: result.error.message as string,
          //     });
          //   } else {
          //     notificationsService.show({
          //       type: ToastType.Success,
          //       text: 'Payment successful',
          //     });
          //   }
          // });
        } catch (error) {
          console.error(error);
          notificationsService.show({
            text: translate('notificationMessages.errorCancelSubscription'),
            type: ToastType.Error,
          });
        }
      } else {
        try {
          const couponCode = coupon === 'null' ? undefined : coupon;
          const { userSubscription } = await paymentService.updateSubscriptionPrice(planId, couponCode);
          if (userSubscription && userSubscription.type === 'subscription') {
            if (userSubscription.userType == UserType.Individual)
              dispatch(planActions.setSubscriptionIndividual(userSubscription));
            if (userSubscription.userType == UserType.Business)
              dispatch(planActions.setSubscriptionBusiness(userSubscription));
          }
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
