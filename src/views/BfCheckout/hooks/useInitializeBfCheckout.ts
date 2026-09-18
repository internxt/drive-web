import { UserType } from '@internxt/sdk/dist/drive/payments/types/types';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { Stripe, StripeElementsOptionsMode } from '@stripe/stripe-js';
import { AppView } from 'app/core/types';
import { Translate } from 'app/i18n/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { useEffect, useState } from 'react';
import navigationService from 'services/navigation.service';
import { STRIPE_MINIMUM_CHARGE_AMOUNT } from 'views/Checkout/constants';
import { checkoutService, paymentService } from 'views/Checkout/services';
import { BF_CHECKOUT_THEME_STYLES } from '../constants';

interface UseInitializeBfCheckoutProps {
  price?: PriceWithTax;
  user?: UserSettings;
  translate: Translate;
}

const isAmountAcceptedByStripe = (amount: number, mode: StripeElementsOptionsMode['mode']): boolean => {
  if (amount === 0) return mode === 'subscription';

  return amount >= STRIPE_MINIMUM_CHARGE_AMOUNT;
};

export const useInitializeBfCheckout = ({ user, price, translate }: UseInitializeBfCheckoutProps) => {
  const [stripeSdk, setStripeSdk] = useState<Stripe | null>(null);
  const [stripeElementsOptions, setStripeElementsOptions] = useState<StripeElementsOptionsMode>();
  const [isCheckoutReady, setIsCheckoutReady] = useState(false);

  useEffect(() => {
    initializeStripe();
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
      loadStripeData();
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

  const initializeStripe = async (): Promise<void> => {
    try {
      const stripe = await paymentService.getStripe();
      setStripeSdk(stripe);
    } catch {
      redirectToFallbackPage();
    }
  };

  const loadStripeData = async (): Promise<void> => {
    if (!price) {
      return;
    }

    try {
      const stripeElements = await checkoutService.loadStripeElements(BF_CHECKOUT_THEME_STYLES, price);
      setStripeElementsOptions(stripeElements);
      setIsCheckoutReady(true);
    } catch {
      redirectToFallbackPage();
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
