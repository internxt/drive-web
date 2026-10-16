import { BaseSyntheticEvent } from 'react';
import { Stripe, StripeElements } from '@stripe/stripe-js';
import { IFormValues } from 'app/core/types';
import { AuthMethodTypes } from './index';

export interface UserInfoProps {
  avatar: string | null;
  name: string;
  email: string;
}

export interface CheckoutViewManager {
  onCouponInputChange: (coupon?: string) => Promise<void>;
  onLogOut: () => Promise<void>;
  onCheckoutButtonClicked: (
    formData: IFormValues,
    event: BaseSyntheticEvent<object, any, any> | undefined,
    stripeSDK: Stripe | null,
    elements: StripeElements | null,
  ) => Promise<void>;
  onRemoveAppliedCouponCode: () => void;
  handleAuthMethodChange: (method: AuthMethodTypes) => void;
  onPostalCodeChanges: (postalCode: string) => void;
}
