import { loadStripe, SetupIntentResult, Stripe } from '@stripe/stripe-js';
import envService from 'app/core/services/env.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import paymentService from 'app/payment/services/payment.service';
import { t } from 'i18next';

let stripe: Stripe;

interface HandleCheckoutProps {
  paymentMethod: string;
  planId: string;
  interval: string;
  email: string;
}

async function paypalSetupIntent(setupIntentId): Promise<SetupIntentResult> {
  if (!stripe) {
    stripe = (await loadStripe(
      envService.isProduction() ? process.env.REACT_APP_STRIPE_PK : process.env.REACT_APP_STRIPE_TEST_PK,
    )) as Stripe;
  }

  return await stripe.confirmPayPalSetup(setupIntentId, {
    return_url: `${window.location.origin}/payment-method`,
    mandate_data: {
      customer_acceptance: {
        type: 'online',
        online: {
          infer_from_client: true,
        },
      },
    },
  });
}

export async function handleCheckout({ paymentMethod, planId, interval, email }: HandleCheckoutProps): Promise<void> {
  localStorage.setItem('FirstStep', 'true');

  if (paymentMethod === 'paypal') {
    try {
      const { client_secret } = await paymentService.createCheckoutSession({
        price_id: planId,
        success_url: `${window.location.origin}/payment-method`,
        cancel_url: `${window.location.origin}/checkout/cancel?price_id=${planId}`,
        customer_email: email,
        mode: interval === 'lifetime' ? 'payment' : 'subscription',
        paymentMethod: paymentMethod,
      });

      paypalSetupIntent(client_secret);
    } catch (error) {
      const err = error as Error;
      console.error('[ERROR/STACK]:', err.stack ?? 'No stack trace');
      notificationsService.show({
        text: t('notificationMessages.errorCancelSubscription'),
        type: ToastType.Error,
      });
    }
  } else {
    try {
      const { id } = await paymentService.createCheckoutSession({
        price_id: planId,
        success_url: `${window.location.origin}/payment-method`,
        cancel_url: `${window.location.origin}/checkout/cancel?price_id=${planId}`,
        customer_email: email,
        mode: interval === 'lifetime' ? 'payment' : 'subscription',
        paymentMethod: paymentMethod,
      });

      localStorage.setItem('sessionId', id);
      await paymentService.redirectToCheckout({ sessionId: id });
    } catch (error) {
      const err = error as Error;
      console.error('[ERROR/STACK]:', err.stack ?? 'No stack trace');
      notificationsService.show({
        text: t('notificationMessages.errorCancelSubscription'),
        type: ToastType.Error,
      });
    }
  }
}
