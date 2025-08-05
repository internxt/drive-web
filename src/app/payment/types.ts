import { DisplayPrice, UserType } from '@internxt/sdk/dist/drive/payments/types/types';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { Stripe, StripeElements } from '@stripe/stripe-js';

export enum Currency {
  'eur' = '€',
  'usd' = '$',
}

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

export type RequestedPlanData = DisplayPrice & {
  decimalAmount: number;
  type: UserType;
  minimumSeats?: number;
  maximumSeats?: number;
};

// Checkout View Data
export type PlanData = {
  selectedPlan: RequestedPlanData;
  upsellPlan: RequestedPlanData;
};

export type AuthMethodTypes = 'signUp' | 'signIn' | 'userIsSignedIn';

export interface ClientSecretData {
  clientSecretType: 'payment' | 'setup';
  client_secret: string;
}

export interface PasswordStateProps {
  tag: 'error' | 'warning' | 'success';
  label: string;
}

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

export interface BasePaymentData {
  customerId: string;
  priceId: string;
  token: string;
  currency: string;
}

export interface PaymentIntentData extends BasePaymentData {
  promoCodeId?: string;
}

export interface PaymentHandlerData extends BasePaymentData {
  elements: StripeElements;
  currentSelectedPlan: PriceWithTax;
  couponCodeData?: CouponCodeData;
  confirmPayment: Stripe['confirmPayment'];
}

export interface GetSubscriptionPaymentIntentPayload extends PaymentIntentData {
  mobileToken: string | null;
  seatsForBusinessSubscription?: number;
}

export interface HandleSubscriptionPaymentPayload extends PaymentHandlerData {
  mobileToken: string | null;
  seatsForBusinessSubscription?: number;
}

export interface HandleUserPaymentPayload extends BasePaymentData {
  selectedPlan: PriceWithTax;
  elements: StripeElements;
  mobileToken: string | null;
  gclidStored: string | null;
  couponCodeData?: CouponCodeData;
  seatsForBusinessSubscription?: number;
  confirmPayment: Stripe['confirmPayment'];
}

export enum PlanInterval {
  YEAR = 'year',
  LIFETIME = 'lifetime',
}

export enum InvoiceStatus {
  PAID = 'paid',
}
