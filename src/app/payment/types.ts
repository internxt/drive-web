import { DisplayPrice } from '@internxt/sdk/dist/drive/payments/types';
import { StripePaymentElementOptions, Stripe, StripeElementsOptions } from '@stripe/stripe-js';

export interface ProductMetadata {
  is_drive: boolean;
  is_teams: boolean;
  show: boolean;
  lifetime_tier: LifetimeTier;
  member_tier: keyof typeof StripeMemberTiers;
  simple_name: keyof typeof RenewalPeriod;
  size_bytes: string;
}

export interface ProductPriceData {
  id: string;
  name: string | null;
  amount: number;
  monthlyAmount: number;
  type: ProductPriceType;
  currency: string;
  recurring: ProductPriceRecurringData | null;
}

export interface ProductPriceRecurringData {
  aggregate_usage: string | null;
  interval: string;
  interval_count: number;
  trial_period_days: number;
  usage_type: string;
}

export interface ProductData {
  id: string;
  name: string;
  metadata: ProductMetadata;
  price: ProductPriceData;
  renewalPeriod: RenewalPeriod;
}

export enum ProductPriceType {
  Recurring = 'recurring',
  OneTime = 'one_time',
}

export enum StripeMemberTiers {
  'infinite',
  'lifetime',
  'premium',
}

export enum StripeSessionMode {
  Payment = 'payment',
  Setup = 'setup',
  Subscription = 'subscription',
}

export enum LifetimeTier {
  Lifetime = 'lifetime',
  Exclusive = 'exclusive-lifetime',
  Infinite = 'infinite',
}

export enum RenewalPeriod {
  Monthly = 'monthly',
  Annually = 'annually',
}

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

export const THEME_STYLES = {
  dark: {
    backgroundColor: 'rgb(17 17 17)',
    textColor: 'rgb(255 255 255)',
  },
  light: {
    backgroundColor: 'rgb(255 255 255)',
    textColor: 'rgb(17 17 17)',
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

export type PartialErrorState = Partial<Record<ErrorType, string>>;

export interface State {
  selectedPlan: SelectedPlanData | null;
  promoCode?: string;
  couponCodeData?: CouponCodeData;
  stripe: Stripe | null;
  elementsOptions?: StripeElementsOptions;
  error?: PartialErrorState;
  authMethod: AuthMethodTypes;
}

export type Action =
  | { type: 'SET_SELECTED_PLAN'; payload: SelectedPlanData }
  | { type: 'SET_PROMO_CODE_NAME'; payload: string }
  | { type: 'SET_COUPON_CODE_DATA'; payload: CouponCodeData }
  | { type: 'SET_STRIPE'; payload: Stripe | null }
  | { type: 'SET_ELEMENTS_OPTIONS'; payload: StripeElementsOptions }
  | { type: 'SET_AUTH_METHOD'; payload: AuthMethodTypes }
  | { type: 'SET_ERROR'; payload: PartialErrorState };
