import { CouponCodeData } from '@internxt/sdk/dist/drive/payments/types/types';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { Stripe, StripeElements } from '@stripe/stripe-js';
import { ActionDialog, DialogActionConfig } from 'app/contexts/dialog-manager/ActionDialogManager.context';

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

export type AuthMethodTypes = 'signUp' | 'signIn' | 'userIsSignedIn';

export type ErrorType = 'auth' | 'stripe' | 'coupon';

export type PartialErrorState = Partial<Record<ErrorType, string>>;

export interface CreatePaymentIntentPayload {
  customerId: string;
  priceId: string;
  token: string;
  currency: string;
  captchaToken: string;
  userAddress: string;
  promoCodeId?: string;
}

export interface ProcessPurchasePayload {
  customerId: string;
  priceId: string;
  token: string;
  currency: string;
  elements: StripeElements;
  captchaToken: string;
  userAddress: string;
  confirmPayment: Stripe['confirmPayment'];
  confirmSetupIntent: Stripe['confirmSetup'];
  openCryptoPaymentDialog?: (key: ActionDialog, config?: DialogActionConfig) => void;
  translate: (key: string) => string;
  currentSelectedPlan: PriceWithTax;
  couponCodeData?: CouponCodeData;
  isFirstPurchase?: boolean;
}

export interface UseUserPaymentPayload {
  customerId: string;
  priceId: string;
  token: string;
  currency: string;
  selectedPlan: PriceWithTax;
  elements: StripeElements;
  userAddress: string;
  confirmPayment: Stripe['confirmPayment'];
  confirmSetupIntent: Stripe['confirmSetup'];
  openCryptoPaymentDialog?: (key: ActionDialog, config?: DialogActionConfig) => void;
  gclidStored: string | null;
  captchaToken: string;
  translate: (key: string) => string;
  couponCodeData?: CouponCodeData;
}

export enum PlanInterval {
  MONTH = 'month',
  YEAR = 'year',
  LIFETIME = 'lifetime',
}

export enum InvoiceStatus {
  PAID = 'paid',
}

export enum PaymentType {
  FIAT = 'fiat',
  CRYPTO = 'crypto',
}

export type { UserInfoProps, CheckoutViewManager } from './checkout.types';
