import { aes } from '@internxt/lib';
import localStorageService from 'app/core/services/local-storage.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import paymentService from 'app/payment/services/payment.service';
import { t } from 'i18next';
import { stripeService } from './stripe.service';

interface HandleCheckoutProps {
  paymentMethod: string;
  planId: string;
  interval: string;
  email: string;
  coupon?: string;
}

export async function handleCheckout({
  paymentMethod,
  planId,
  interval,
  email,
  coupon,
}: HandleCheckoutProps): Promise<void> {
  const couponCode = coupon && { coupon: coupon };

  if (paymentMethod === 'paypal') {
    try {
      const paypalIntent = await paymentService.getPaypalSetupIntent({ priceId: planId, ...couponCode });
      const clientSecretEncrypted = aes.encrypt(paypalIntent.client_secret, localStorageService.getUser()!.mnemonic);

      localStorage.setItem('setupIntentId', clientSecretEncrypted);

      await stripeService.paypalSetupIntent(paypalIntent.client_secret);
    } catch (error) {
      const err = error as Error;
      console.error('[ERROR/STACK]:', err.stack ?? 'No stack trace');
      notificationsService.show({
        text: t('notificationMessages.errorCancelSubscription'),
        type: ToastType.Error,
      });
    }
  } else {
    const couponCode = coupon
      ? {
          coupon_code: coupon,
        }
      : {};
    try {
      const { sessionId } = await paymentService.createCheckoutSession({
        price_id: planId,
        success_url: `${window.location.origin}/payment-method?payment=success`,
        cancel_url: `${window.location.origin}/checkout/cancel?price_id=${planId}`,
        customer_email: email,
        mode: interval === 'lifetime' ? 'payment' : 'subscription',
        ...couponCode,
      });

      localStorage.setItem('sessionId', sessionId);

      await paymentService.redirectToCheckout({ sessionId });
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
