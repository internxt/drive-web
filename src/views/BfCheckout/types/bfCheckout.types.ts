import { Stripe, StripeElements } from '@stripe/stripe-js';
import { IFormValues } from 'app/core/types';
import { BaseSyntheticEvent } from 'react';
import { AuthMethodTypes } from 'views/Checkout/types';

export type { UserInfoProps } from 'views/Checkout/types/checkout.types';

export interface BfCheckoutManager {
  onLogOut: () => Promise<void>;
  onCheckoutButtonClicked: (
    formData: IFormValues,
    event: BaseSyntheticEvent | undefined,
    stripeSDK: Stripe | null,
    elements: StripeElements | null,
  ) => Promise<void>;
  handleAuthMethodChange: (method: AuthMethodTypes) => void;
  onCurrencyChange: (currency: string) => void;
}
