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
import metaService from 'app/analytics/meta.service';
import { userStoragePolling } from 'utils/userStoragePolling.utils';
import { ResendAccountSetupEmailButton } from '../components/ResendAccountSetupEmailButton';

export function removePaymentsStorage() {
  localStorageService.removeItem(LocalStorageItem.SubscriptionID);
  localStorageService.removeItem(LocalStorageItem.PaymentIntentID);
  localStorageService.removeItem(LocalStorageItem.AmountPaid);
  localStorageService.removeItem(LocalStorageItem.ProductName);
  localStorageService.removeItem(LocalStorageItem.PriceId);
  localStorageService.removeItem(LocalStorageItem.Currency);
  localStorageService.removeItem(LocalStorageItem.CouponCode);
}

const CheckYourEmail = ({ email }: { email: string }) => {
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

const CheckoutSuccessView = (): JSX.Element => {
  const dispatch = useAppDispatch();
  const hasTrackedRef = useRef(false);
  const hasSession = Boolean(encryptedStorageService.getToken());
  const [accountSetupEmail] = useState(() =>
    hasSession ? null : localStorageService.get(LocalStorageItem.CheckoutAccountSetupEmail),
  );

  const onCheckoutSuccess = useCallback(async () => {
    if (hasTrackedRef.current) {
      return;
    }

    hasTrackedRef.current = true;

    try {
      metaService.trackPurchase();
      await gaService.trackPurchase();
      await trackPaymentConversion();

      removePaymentsStorage();
    } catch (err) {
      console.error('Analytics error:', err);
    }

    if (accountSetupEmail) {
      return;
    }

    if (hasSession) {
      localStorageService.removeItem(LocalStorageItem.CheckoutAccountSetupEmail);
    }

    userStoragePolling();

    navigationService.push(AppView.Drive);
  }, [dispatch]);

  useEffectAsync(onCheckoutSuccess, []);

  if (accountSetupEmail) {
    return <CheckYourEmail email={accountSetupEmail} />;
  }

  return <div></div>;
};

export default CheckoutSuccessView;
