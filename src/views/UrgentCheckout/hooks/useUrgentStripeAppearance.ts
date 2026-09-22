import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { StripeElementsOptionsMode } from '@stripe/stripe-js';
import { useEffect, useMemo, useState } from 'react';
import { checkoutService } from 'views/Checkout/services';
import { URGENT_CHECKOUT_THEME_STYLES } from '../constants';

type StripeAppearance = StripeElementsOptionsMode['appearance'];

export const useUrgentStripeAppearance = (
  stripeElementsOptions: StripeElementsOptionsMode | undefined,
  price?: PriceWithTax,
): StripeElementsOptionsMode | undefined => {
  const [appearance, setAppearance] = useState<StripeAppearance>();

  useEffect(() => {
    if (!price) {
      return;
    }

    checkoutService
      .loadStripeElements(URGENT_CHECKOUT_THEME_STYLES, price)
      .then((urgentElementsOptions) => setAppearance(urgentElementsOptions.appearance));
  }, [price?.price?.id]);

  return useMemo(() => {
    if (!stripeElementsOptions || !appearance) {
      return undefined;
    }

    return { ...stripeElementsOptions, appearance };
  }, [stripeElementsOptions, appearance]);
};
