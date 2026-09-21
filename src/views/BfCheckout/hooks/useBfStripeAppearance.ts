import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { StripeElementsOptionsMode } from '@stripe/stripe-js';
import { useEffect, useMemo, useState } from 'react';
import { checkoutService } from 'views/Checkout/services';
import { BF_CHECKOUT_THEME_STYLES } from '../constants';

type StripeAppearance = StripeElementsOptionsMode['appearance'];

export const useBfStripeAppearance = (
  stripeElementsOptions: StripeElementsOptionsMode | undefined,
  price?: PriceWithTax,
): StripeElementsOptionsMode | undefined => {
  const [appearance, setAppearance] = useState<StripeAppearance>();

  useEffect(() => {
    if (!price) {
      return;
    }

    checkoutService
      .loadStripeElements(BF_CHECKOUT_THEME_STYLES, price)
      .then((bfElementsOptions) => setAppearance(bfElementsOptions.appearance));
  }, [price?.price?.id]);

  return useMemo(() => {
    if (!stripeElementsOptions || !appearance) {
      return undefined;
    }

    return { ...stripeElementsOptions, appearance };
  }, [stripeElementsOptions, appearance]);
};
