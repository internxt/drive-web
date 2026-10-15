import { Stripe, StripeElementsOptionsMode } from '@stripe/stripe-js';
import { checkoutService, paymentService } from '../services';
import { useEffect, useState } from 'react';
import { errorService, navigationService } from 'services';
import { AppView } from 'app/core/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { STRIPE_MINIMUM_CHARGE_AMOUNT, THEME_STYLES } from '../constants';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { UserType } from '@internxt/sdk/dist/drive/payments/types/types';
import { Translate } from 'app/i18n/types';

interface UseInitializeCheckoutProps {
  checkoutTheme: string;
  price?: PriceWithTax;
  user?: UserSettings;
  translate: Translate;
}

const isAmountAcceptedByStripe = (amount: number, mode: StripeElementsOptionsMode['mode']): boolean => {
  if (amount === 0) return mode === 'subscription';

  return amount >= STRIPE_MINIMUM_CHARGE_AMOUNT;
};

export const useInitializeCheckout = ({ user, price, checkoutTheme, translate }: UseInitializeCheckoutProps) => {
  const [stripeSdk, setStripeSdk] = useState<Stripe | null>(null);
  const [stripeElementsOptions, setStripeElementsOptions] = useState<StripeElementsOptionsMode>();
  const [isCheckoutReady, setIsCheckoutReady] = useState(false);

  useEffect(() => {
    initCheckout();
  }, []);

  useEffect(() => {
    if (price?.price.type === UserType.Business) {
      notificationsService.show({
        text: translate('checkout.error.businessPlan'),
        type: ToastType.Warning,
      });
      return redirectToFallbackPage();
    }

    if (stripeSdk && price) {
      loadStripeElements();
    }
  }, [stripeSdk, price?.price?.id]);

  useEffect(() => {
    const amount = price?.taxes?.amountWithTax;

    if (amount === undefined) return;

    setStripeElementsOptions((prevOptions) => {
      const isAmountWorthUpdating =
        prevOptions && prevOptions.amount !== amount && isAmountAcceptedByStripe(amount, prevOptions.mode);

      return isAmountWorthUpdating ? { ...prevOptions, amount } : prevOptions;
    });
  }, [price?.taxes?.amountWithTax]);

  const initCheckout = async () => {
    try {
      await initializeStripe();
    } catch {
      redirectToFallbackPage();
    }
  };

  const loadStripeElements = async () => {
    try {
      await loadStripeData();
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

  const loadStripeData = async () => {
    if (!checkoutTheme || !price) {
      return;
    }

    try {
      const stripeElements = await checkoutService.loadStripeElements(THEME_STYLES[checkoutTheme], price);
      setStripeElementsOptions(stripeElements);
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
    isCheckoutReady,
  };
};
