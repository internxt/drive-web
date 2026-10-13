import { paymentService } from 'views/Checkout/services';
import envService from 'services/env.service';
import encryptedStorageService from 'services/encrypted-storage.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { clearPaymentStorage } from 'services/storage-keys';
import { Translate } from 'app/i18n/types';
import metaService from './meta.service';
import gaService from './ga.service';
import { trackPaymentConversion } from './impact.service';

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

const sendUserDependentPurchaseTrackers = async (isProduction: boolean): Promise<void> => {
  if (isProduction) {
    await gaService.trackPurchase();
    await trackPaymentConversion();
  } else {
    console.info('[Analytics] GA and Impact purchase events are not sent outside production');
  }

  clearPaymentStorage();
};

export const trackCheckoutCompleted = async (translate: Translate): Promise<void> => {
  try {
    if (await hasStripeReportedPaymentFailed()) {
      notificationsService.show({ text: translate('checkout.error.paymentFailed'), type: ToastType.Error });
      clearPaymentStorage();
      return;
    }

    const isProduction = envService.isProduction();
    if (!isProduction) {
      console.info('[Analytics] Purchase events are not sent outside production');
    }

    if (isProduction) {
      metaService.trackPurchase();
    }

    const hasUser = Boolean(await encryptedStorageService.getUser());
    if (hasUser) {
      await sendUserDependentPurchaseTrackers(isProduction);
    }
  } catch (err) {
    console.error('Analytics error:', err);
  }
};

export const trackDeferredPurchase = async (): Promise<void> => {
  try {
    await sendUserDependentPurchaseTrackers(envService.isProduction());
  } catch (err) {
    console.error('Analytics error:', err);
  }
};
