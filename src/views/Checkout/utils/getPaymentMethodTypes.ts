import { PriceWithTax } from '@internxt/sdk/dist/payments/types';

export type StripePaymentMethodType = 'card' | 'paypal' | 'klarna' | 'pix' | 'upi';

type WalletMethod = 'apple_pay' | 'google_pay';

export type DisplayPaymentMethod = StripePaymentMethodType | WalletMethod;

const WALLET_METHODS = new Set<WalletMethod>(['apple_pay', 'google_pay']);

const PAYMENT_METHOD_ORDER_BY_COUNTRY: Record<string, DisplayPaymentMethod[]> = {
  US: ['apple_pay', 'google_pay', 'paypal', 'klarna', 'card'],
  DE: ['paypal', 'klarna', 'apple_pay', 'google_pay', 'card'],
  ES: ['apple_pay', 'google_pay', 'card', 'paypal', 'klarna'],
  IT: ['apple_pay', 'google_pay', 'paypal', 'card', 'klarna'],
  FR: ['apple_pay', 'google_pay', 'card', 'paypal', 'klarna'],
  BR: ['pix', 'apple_pay', 'google_pay', 'card', 'paypal'],
  IN: ['upi', 'google_pay', 'apple_pay', 'card', 'paypal'],
};

const DEFAULT_PAYMENT_METHOD_ORDER: DisplayPaymentMethod[] = ['apple_pay', 'google_pay', 'card', 'paypal', 'klarna'];

const KLARNA_SUPPORTED_CURRENCIES = new Set<string>(['eur']);

const isWalletMethod = (method: DisplayPaymentMethod): method is WalletMethod =>
  WALLET_METHODS.has(method as WalletMethod);

const isPaymentMethodEligible = (method: DisplayPaymentMethod, plan: PriceWithTax): boolean => {
  const interval = plan?.price?.interval;
  const currency = plan?.price?.currency?.toLowerCase();

  switch (method) {
    case 'klarna':
      return interval === 'lifetime' && !!currency && KLARNA_SUPPORTED_CURRENCIES.has(currency);
    case 'pix':
      return currency === 'brl';
    case 'upi':
      return currency === 'inr';
    default:
      return true;
  }
};

const getOrderedPaymentMethods = (country: string | undefined, plan: PriceWithTax): DisplayPaymentMethod[] => {
  const order = PAYMENT_METHOD_ORDER_BY_COUNTRY[country?.toUpperCase() ?? ''] ?? DEFAULT_PAYMENT_METHOD_ORDER;

  return order.filter((method) => isPaymentMethodEligible(method, plan));
};
export const getPaymentMethodOrder = (country: string | undefined, plan: PriceWithTax): DisplayPaymentMethod[] =>
  getOrderedPaymentMethods(country, plan);

export const getPaymentMethodTypes = (country: string | undefined, plan: PriceWithTax): StripePaymentMethodType[] => {
  const types = getOrderedPaymentMethods(country, plan).filter(
    (method): method is StripePaymentMethodType => !isWalletMethod(method),
  );

  return types.length > 0 ? types : ['card'];
};
