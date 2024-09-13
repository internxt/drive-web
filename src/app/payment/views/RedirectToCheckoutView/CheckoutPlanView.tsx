import { UserType } from '@internxt/sdk/dist/drive/payments/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import paymentService from 'app/payment/services/payment.service';
import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { planActions, PlanState } from 'app/store/slices/plan';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import errorService from '../../../core/services/error.service';
import { uiActions } from '../../../store/slices/ui';
import workspacesSelectors from '../../../store/slices/workspaces/workspaces.selectors';

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

// THIS ONLY APPLY TO B2B PLANS, BECAUSE B2C USES THE INTEGRATED CHECKOUT
export default function CheckoutPlanView(): JSX.Element {
  const dispatch = useAppDispatch();
  const { translate } = useTranslationContext();
  const params = new URLSearchParams(window.location.search);
  const planType = String(params.get('planType'));

  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);

  const plan = useSelector((state: RootState) => state.plan) as PlanState;
  const user = useSelector((state: RootState) => state.user.user) as UserSettings;
  if (user === undefined) {
    navigationService.push(AppView.Login);
  }
  const { individualSubscription, businessSubscription } = plan;

  const subscription = planType === 'business' ? businessSubscription : individualSubscription;

  useEffect(() => {
    if (subscription) {
      const params = new URLSearchParams(window.location.search);
      const planId = String(params.get('planId'));
      const coupon = String(params.get('couponCode'));
      const mode = String(params.get('mode') as string | undefined);
      const freeTrials = Number(params.get('freeTrials'));
      const currency = String(params.get('currency'));
      const planType = String(params.get('planType'));

      checkout(planId, currency, coupon, mode, freeTrials, planType);
    }
  }, [subscription]);

  async function checkout(
    planId: string,
    currency: string,
    coupon?: string,
    mode?: string,
    freeTrials?: number,
    planType?: string,
  ) {
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

        response = await paymentService.createCheckoutSession(checkoutOptions);
        localStorage.setItem('sessionId', response.sessionId);

        await paymentService.redirectToCheckout(response);
      } catch (err) {
        errorService.reportError(err);
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
          notificationsService.show({
            text: translate('notificationMessages.errorCancelSubscription'),
            type: ToastType.Error,
          });
        }
      } else {
        try {
          if (planType === 'business') {
            notificationsService.show({
              text: translate('notificationMessages.errorPurchaseBusinessPlan'),
              type: ToastType.Info,
            });
            navigationService.push(AppView.Login);
          }
          const couponCode = coupon === 'null' ? undefined : coupon;
          const { userSubscription } = await paymentService.updateSubscriptionPrice({
            priceId: planId,
            coupon: couponCode,
            userType: UserType.Business,
          });
          if (userSubscription && userSubscription.type === 'subscription') {
            if (userSubscription.userType == UserType.Business)
              dispatch(planActions.setSubscriptionBusiness(userSubscription));
          }
          navigationService.openPreferencesDialog({
            section: 'account',
            subsection: 'account',
            workspaceUuid: selectedWorkspace?.workspaceUser.workspaceId,
          });
          dispatch(uiActions.setIsPreferencesDialogOpen(true));
        } catch (err) {
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
