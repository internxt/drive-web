import { BaseSyntheticEvent } from 'react';
import { Stripe, StripeElements } from '@stripe/stripe-js';
import { IFormValues } from 'app/core/types';
import { AuthMethodTypes } from './index';

export interface UserInfoProps {
  avatar: Blob | null;
  name: string;
  email: string;
}

export interface CheckoutViewManager {
  onCouponInputChange: (coupon?: string) => Promise<void>;
  onLogOut: () => Promise<void>;
  onCountryChange: (country: string) => void;
  onPostalCodeChange: (postalCode: string) => void;
  onCheckoutButtonClicked: (
    formData: IFormValues,
    event: BaseSyntheticEvent<object, any, any> | undefined,
    stripeSDK: Stripe | null,
    elements: StripeElements | null,
  ) => Promise<void>;
  onRemoveAppliedCouponCode: () => void;
  handleAuthMethodChange: (method: AuthMethodTypes) => void;
  onUserNameFromAddressElementChange: (userName: string) => void;
  onSeatsChange: (seat: number) => void;
  onCurrencyChange: (currency: string) => void;
}
