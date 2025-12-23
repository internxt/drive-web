import { useEffect, useState } from 'react';
import { Stripe, StripeElementsOptions } from '@stripe/stripe-js';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { CryptoCurrency, PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { checkoutService, currencyService, paymentService } from '../services';
import { errorService, navigationService } from 'services';
import { AppView } from 'app/core/types';
import { PlanInterval } from '../types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';

const THEME_STYLES = {
  dark: {
    backgroundColor: 'rgb(17 17 17)',
    textColor: 'rgb(255 255 255)',
    borderColor: 'rgb(58, 58, 59)',
    borderInputColor: 'rgb(142, 142, 148)',
    labelTextColor: 'rgb(229 229 235)',
  },
  light: {
    backgroundColor: 'rgb(255 255 255)',
    textColor: 'rgb(17 17 17)',
    borderColor: 'rgb(229, 229, 235)',
    borderInputColor: 'rgb(174, 174, 179)',
    labelTextColor: 'rgb(58 58 59)',
  },
};

interface UseInitializeCheckoutProps {
  checkoutTheme: string;
  price?: PriceWithTax;
  user?: UserSettings;
  translate: (key: string) => string;
}

const IS_CRYPTO_PAYMENT_ENABLED = true;

export const useInitializeCheckout = ({ user, price, checkoutTheme, translate }: UseInitializeCheckoutProps) => {
  const [stripeSdk, setStripeSdk] = useState<Stripe | null>(null);
  const [stripeElementsOptions, setStripeElementsOptions] = useState<StripeElementsOptions>();
  const [isCheckoutReady, setIsCheckoutReady] = useState(false);
  const [availableCryptoCurrencies, setAvailableCryptoCurrencies] = useState<CryptoCurrency[] | undefined>(undefined);

  useEffect(() => {
    initCheckout();
  }, []);

  useEffect(() => {
    if (stripeSdk && price) {
      loadStripeAndCrypto();
    }
  }, [stripeSdk, price?.price?.id]);

  const initCheckout = async () => {
    try {
      await initializeStripe();
    } catch {
      redirectToFallbackPage();
    }
  };

  const loadStripeAndCrypto = async () => {
    try {
      await Promise.all([loadStripeData(), loadCryptoCurrencies()]);
    } catch {
      redirectToFallbackPage();
    }

    setIsCheckoutReady(true);
  };

  const initializeStripe = async (): Promise<void> => {
    try {
      const stripe = await paymentService.getStripe();
      setStripeSdk(stripe);
    } catch {
      throw new Error('Stripe failed to load');
    }
  };

  const loadCryptoCurrencies = async () => {
    if (price?.price.interval === PlanInterval.LIFETIME && IS_CRYPTO_PAYMENT_ENABLED) {
      try {
        const availableCryptoCurrencies = await currencyService.getAvailableCryptoCurrencies();
        setAvailableCryptoCurrencies(availableCryptoCurrencies);
      } catch (error) {
        console.error('Error fetching available crypto currencies', error);
        notificationsService.show({
          text: translate('checkout.error.fetchingCryptoCurrencies'),
          type: ToastType.Error,
        });
      }
    }
  };

  const loadStripeData = async () => {
    if (!checkoutTheme || !price) {
      return;
    }

    try {
      const stripeElements = await checkoutService.loadStripeElements(THEME_STYLES[checkoutTheme], price);
      setStripeElementsOptions(stripeElements as StripeElementsOptions);
    } catch (error) {
      const castedError = errorService.castError(error);
      throw new Error(castedError.message);
    }
  };

  const redirectToFallbackPage = () => {
    if (user) {
      navigationService.push(AppView.Drive);
    } else {
      navigationService.push(AppView.Signup);
    }
  };

  return {
    stripeSdk,
    stripeElementsOptions,
    availableCryptoCurrencies,
    isCheckoutReady,
  };
};
