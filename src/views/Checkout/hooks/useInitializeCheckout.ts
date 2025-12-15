import { Stripe, StripeElementsOptions } from '@stripe/stripe-js';
import { checkoutService, currencyService, paymentService } from '../services';
import { useEffect, useState } from 'react';
import { errorService, navigationService } from 'services';
import { AppView } from 'app/core/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { UserLocation } from '@internxt/sdk';
import { userLocation } from 'utils';
import { CryptoCurrency, PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { THEME_STYLES } from '../views/CheckoutViewWrapper';
import { PlanInterval } from '../types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';

interface UseInitializeCheckoutProps {
  checkoutTheme: string;
  price?: PriceWithTax;
  user?: UserSettings;
  translate: (key: string) => string;
}

const IS_CRYPTO_PAYMENT_ENABLED = true;

export const useInitializeCheckout = ({ user, price, checkoutTheme, translate }: UseInitializeCheckoutProps) => {
  const [stripeSdk, setStripeSdk] = useState<Stripe | null>(null);
  const [location, setLocation] = useState<UserLocation>();
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
      await fetchUserLocationAndStore();
    } catch (error) {
      redirectToFallbackPage();
    }
  };

  const loadStripeAndCrypto = async () => {
    try {
      await loadStripeData();
      await loadCryptoCurrencies();
    } catch (error) {
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

  const fetchUserLocationAndStore = async (): Promise<UserLocation | undefined> => {
    try {
      const location = await userLocation();
      setLocation(location);
      return location;
    } catch {
      // NO OP
      return undefined;
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
    location,
    stripeSdk,
    stripeElementsOptions,
    availableCryptoCurrencies,
    isCheckoutReady,
  };
};
