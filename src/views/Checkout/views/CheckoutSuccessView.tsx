import useEffectAsync from 'hooks/useEffectAsync';
import navigationService from 'services/navigation.service';
import { AppView, LocalStorageItem } from 'app/core/types';
import { useAppDispatch } from 'app/store/hooks';
import { useCallback, useRef, useState } from 'react';
import { CheckCircle } from '@phosphor-icons/react';
import localStorageService from 'services/local-storage.service';
import encryptedStorageService from 'services/encrypted-storage.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { trackPaymentConversion } from 'app/analytics/impact.service';
import gaService from 'app/analytics/ga.service';
import { PURCHASE_LOCAL_STORAGE_ITEMS } from 'services/storage-keys';
import metaService from 'app/analytics/meta.service';
import { userStoragePolling } from 'utils/userStoragePolling.utils';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { paymentService } from '../services';
import envService from 'services/env.service';
import { ResendAccountSetupEmailButton } from '../components/ResendAccountSetupEmailButton';

export function removePaymentsStorage() {
  PURCHASE_LOCAL_STORAGE_ITEMS.forEach((item) => localStorageService.removeItem(item));
}

const AccountSetupEmailSentCard = ({ email }: { email: string }) => {
  const { translate } = useTranslationContext();

  return (
    <div className="flex h-full w-full items-center justify-center bg-gray-1 px-5">
      <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl border border-gray-10 bg-surface p-8 text-center">
        <CheckCircle size={80} weight="thin" className="text-primary" />
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-medium text-gray-100">{translate('checkout.accountSetup.checkEmail.title')}</h1>
          <p className="text-gray-80">{translate('checkout.accountSetup.checkEmail.description')}</p>
          <p className="break-all font-medium text-gray-100">{email}</p>
        </div>
        <ResendAccountSetupEmailButton email={email} />
        <p className="text-sm text-gray-50">{translate('checkout.accountSetup.checkEmail.spamHint')}</p>
      </div>
    </div>
  );
};

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

const sendPurchaseEvents = async (): Promise<void> => {
  if (!envService.isProduction()) {
    console.info('[Analytics] Purchase events are not sent outside production');
    return;
  }

  metaService.trackPurchase();
  await gaService.trackPurchase();
  await trackPaymentConversion();
};

const CheckoutSuccessView = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const { translate } = useTranslationContext();
  const hasTrackedRef = useRef(false);
  const hasSession = Boolean(encryptedStorageService.getToken());
  const [accountSetupEmail] = useState(() =>
    hasSession ? null : localStorageService.get(LocalStorageItem.CheckoutAccountSetupEmail),
  );

  // `startNewAccountSession` already clears the storage, so no need to clear the CheckoutAccountSetupEmail variable here
  const onCheckoutSuccess = useCallback(async () => {
    if (hasTrackedRef.current) {
      return;
    }

    hasTrackedRef.current = true;

    try {
      if (await hasStripeReportedPaymentFailed()) {
        notificationsService.show({ text: translate('checkout.error.paymentFailed'), type: ToastType.Error });
      } else {
        await sendPurchaseEvents();
      }

      removePaymentsStorage();
    } catch (err) {
      console.error('Analytics error:', err);
    }

    if (accountSetupEmail) {
      return;
    }

    userStoragePolling();

    navigationService.push(AppView.Drive);
  }, [dispatch, translate]);

  useEffectAsync(onCheckoutSuccess, []);

  if (accountSetupEmail) {
    return <AccountSetupEmailSentCard email={accountSetupEmail} />;
  }

  return <div></div>;
};

export default CheckoutSuccessView;
