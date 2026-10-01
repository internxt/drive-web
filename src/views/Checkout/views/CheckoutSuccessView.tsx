import useEffectAsync from 'hooks/useEffectAsync';
import navigationService from 'services/navigation.service';
import { AppView } from 'app/core/types';
import { useAppDispatch } from 'app/store/hooks';
import { useCallback, useRef } from 'react';
import localStorageService from 'services/local-storage.service';
import { trackPaymentConversion } from 'app/analytics/impact.service';
import gaService from 'app/analytics/ga.service';
import { PURCHASE_LOCAL_STORAGE_ITEMS } from 'services/storage-keys';
import metaService from 'app/analytics/meta.service';
import { userStoragePolling } from 'utils/userStoragePolling.utils';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { paymentService } from '../services';

export function removePaymentsStorage() {
  PURCHASE_LOCAL_STORAGE_ITEMS.forEach((item) => localStorageService.removeItem(item));
}

const isPaymentSuccessful = async (): Promise<boolean> => {
  const params = new URLSearchParams(globalThis.location.search);
  const setupIntentSecret = params.get('setup_intent_client_secret');
  const paymentIntentSecret = params.get('payment_intent_client_secret');

  let intentStatus: string | undefined;
  const stripe = await paymentService.getStripe();

  if (paymentIntentSecret) {
    const { paymentIntent } = await stripe.retrievePaymentIntent(paymentIntentSecret);
    intentStatus = paymentIntent?.status;
  } else if (setupIntentSecret) {
    const { setupIntent } = await stripe.retrieveSetupIntent(setupIntentSecret);
    intentStatus = setupIntent?.status;
  }

  return intentStatus === 'succeeded';
};

const CheckoutSuccessView = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const { translate } = useTranslationContext();
  const hasTrackedRef = useRef(false);

  const onCheckoutSuccess = useCallback(async () => {
    if (hasTrackedRef.current) {
      return;
    }

    hasTrackedRef.current = true;

    try {
      if (await isPaymentSuccessful()) {
        metaService.trackPurchase();
        await gaService.trackPurchase();
        await trackPaymentConversion();
      } else {
        notificationsService.show({ text: translate('checkout.error.paymentFailed'), type: ToastType.Error });
      }

      removePaymentsStorage();
    } catch (err) {
      console.error('Analytics error:', err);
    }

    userStoragePolling();

    navigationService.push(AppView.Drive);
  }, [dispatch, translate]);

  useEffectAsync(onCheckoutSuccess, []);

  return <div></div>;
};

export default CheckoutSuccessView;
