import { DisplayPrice } from '@internxt/sdk/dist/drive/payments/types';
import { StripePaymentElementOptions } from '@stripe/stripe-js';

export type SelectedPlanData = DisplayPrice & { amountWithDecimals: number };

export type AuthMethodTypes = 'signUp' | 'signIn' | 'userIsSignedIn';

export interface ClientSecretData {
  clientSecretType: 'payment' | 'setup';
  client_secret: string;
}

export interface PasswordStateProps {
  tag: 'error' | 'warning' | 'success';
  label: string;
}

export const PAYMENT_ELEMENT_OPTIONS: StripePaymentElementOptions = {
  layout: {
    type: 'accordion',
    defaultCollapsed: false,
    radios: false,
    spacedAccordionItems: true,
  },
};

export interface CouponCodeData {
  codeId: string;
  codeName: string;
  amountOff?: number;
  percentOff?: number;
}

export interface ErrorStates {
  authError: string;
  stripeError: string;
  couponError: string;
}

export type ErrorType = 'auth' | 'stripe' | 'coupon';
