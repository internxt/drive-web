import { BaseSyntheticEvent } from 'react';
import { Stripe, StripeElements } from '@stripe/stripe-js';
import { IFormValues } from 'app/core/types';
import { AuthMethodTypes } from '../../../types';

export interface UserInfoProps {
  avatar: Blob | null;
  name: string;
  email: string;
}

export interface AddressProvider {
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface CheckoutViewManager {
  onCouponInputChange: (coupon?: string) => Promise<void>;
  onLogOut: () => Promise<void>;
  onUserAddressChanges: (address: AddressProvider) => void;
  onCheckoutButtonClicked: (
    formData: IFormValues,
    event: BaseSyntheticEvent<object, any, any> | undefined,
    stripeSDK: Stripe | null,
    elements: StripeElements | null,
  ) => Promise<void>;
  onRemoveAppliedCouponCode: () => void;
  handleAuthMethodChange: (method: AuthMethodTypes) => void;
  onSeatsChange: (seat: number) => void;
  onCurrencyChange: (currency: string) => void;
  onUserNameChanges: (userName: string) => void;
}
