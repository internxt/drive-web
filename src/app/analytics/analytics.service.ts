import { paymentService } from 'views/Checkout/services';
import envService from 'services/env.service';
import encryptedStorageService from 'services/encrypted-storage.service';
import localStorageService from 'services/local-storage.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { clearPaymentStorage } from 'services/storage-keys';
import { Translate } from 'app/i18n/types';
import { LocalStorageItem } from 'app/core/types';
import { PurchaseBuyer, sendPurchaseEvents as sendAnalyticsPurchaseEvents } from '@internxt/analytics';
import { sendPurchasePostback } from './partnerPostback.service';

const hasStripeReportedPaymentFailed = async (): Promise<boolean> => {
  const params = new URLSearchParams(globalThis.location.search);
  const setupIntentSecret = params.get('setup_intent_client_secret');
  const paymentIntentSecret = params.get('payment_intent_client_secret');

  if (!paymentIntentSecret && !setupIntentSecret) {
    return false;
  }

  let intentStatus: string | undefined;
  const stripe = await paymentService.getStripe();

  if (paymentIntentSecret) {
    const { paymentIntent } = await stripe.retrievePaymentIntent(paymentIntentSecret);
    intentStatus = paymentIntent?.status;
  } else if (setupIntentSecret) {
    const { setupIntent } = await stripe.retrieveSetupIntent(setupIntentSecret);
    intentStatus = setupIntent?.status;
  }

  return intentStatus !== 'succeeded';
};

const getPurchaseBuyer = async (): Promise<PurchaseBuyer | null> => {
  const user = await encryptedStorageService.getUser();
  if (user) {
    return { id: user.uuid, email: user.email };
  }

  const customerId = localStorageService.get(LocalStorageItem.CheckoutCustomerId);
  const email = localStorageService.get(LocalStorageItem.CheckoutAccountSetupEmail);
  if (customerId && email) {
    return { id: customerId, email };
  }

  return null;
};

const sendPurchaseEvents = async (): Promise<void> => {
  if (!envService.isProduction()) {
    console.info('[Analytics] Purchase events are not sent outside production');
    return;
  }

  const buyer = await getPurchaseBuyer();
  await sendAnalyticsPurchaseEvents(buyer);

  if (buyer) {
    await sendPurchasePostback();
  }
};

export const trackCheckoutCompleted = async (translate: Translate): Promise<void> => {
  try {
    if (await hasStripeReportedPaymentFailed()) {
      notificationsService.show({ text: translate('checkout.error.paymentFailed'), type: ToastType.Error });
    } else {
      await sendPurchaseEvents();
    }
  } catch (err) {
    console.error('Analytics error:', err);
  } finally {
    clearPaymentStorage();
  }
};
