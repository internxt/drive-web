import { describe, expect, it } from 'vitest';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { getPaymentMethodOrder, getPaymentMethodTypes } from './getPaymentMethodTypes';

const buildPlan = (interval: string, currency: string): PriceWithTax =>
  ({
    price: { interval, currency },
  }) as unknown as PriceWithTax;

describe('Ordering payment methods by country', () => {
  it('When the country has a configured order, then the methods keep that order', () => {
    const result = getPaymentMethodTypes('ES', buildPlan('lifetime', 'eur'));

    expect(result).toStrictEqual(['card', 'paypal', 'klarna']);
  });

  it('When the country is configured with a different priority, then that priority is respected', () => {
    const result = getPaymentMethodTypes('DE', buildPlan('lifetime', 'eur'));

    expect(result).toStrictEqual(['paypal', 'klarna', 'card']);
  });

  it('When the country code is lowercase, then it is still matched', () => {
    const result = getPaymentMethodTypes('fr', buildPlan('lifetime', 'eur'));

    expect(result).toStrictEqual(['card', 'paypal', 'klarna']);
  });

  it('When the country has no configured order, then it falls back to the default order', () => {
    const result = getPaymentMethodTypes('NL', buildPlan('lifetime', 'eur'));

    expect(result).toStrictEqual(['card', 'paypal', 'klarna']);
  });

  it('When no country is provided, then it falls back to the default order', () => {
    const result = getPaymentMethodTypes(undefined, buildPlan('lifetime', 'eur'));

    expect(result).toStrictEqual(['card', 'paypal', 'klarna']);
  });
});

describe('Filtering out payment methods that are not eligible for the plan', () => {
  it('When the plan is a recurring subscription, then Klarna is removed because it only supports one-time payments', () => {
    const result = getPaymentMethodTypes('ES', buildPlan('year', 'eur'));

    expect(result).toStrictEqual(['card', 'paypal']);
  });

  it('When a lifetime plan is billed in a currency where Klarna is not enabled, then Klarna is removed', () => {
    const result = getPaymentMethodTypes('US', buildPlan('lifetime', 'usd'));

    expect(result).toStrictEqual(['paypal', 'card']);
  });

  it('When Pix is preferred but the plan is not billed in Brazilian reais, then Pix is removed', () => {
    const result = getPaymentMethodTypes('BR', buildPlan('year', 'eur'));

    expect(result).toStrictEqual(['card', 'paypal']);
  });

  it('When the plan is billed in Brazilian reais, then Pix is offered first', () => {
    const result = getPaymentMethodTypes('BR', buildPlan('year', 'brl'));

    expect(result).toStrictEqual(['pix', 'card', 'paypal']);
  });

  it('When the plan is billed in Indian rupees, then UPI is offered first', () => {
    const result = getPaymentMethodTypes('IN', buildPlan('year', 'inr'));

    expect(result).toStrictEqual(['upi', 'card', 'paypal']);
  });

  it('When every preferred method is filtered out, then card is always kept as a fallback', () => {
    const result = getPaymentMethodTypes('IN', buildPlan('year', 'eur'));

    expect(result).toStrictEqual(['card', 'paypal']);
  });
});

describe('Building the visual order shown to the customer (including wallets)', () => {
  it('When the customer is in a country that leads with wallets, then wallets are placed first', () => {
    const result = getPaymentMethodOrder('ES', buildPlan('lifetime', 'eur'));

    expect(result).toStrictEqual(['apple_pay', 'google_pay', 'card', 'paypal', 'klarna']);
  });

  it('When the country places wallets after other methods, then that position is respected', () => {
    const result = getPaymentMethodOrder('DE', buildPlan('lifetime', 'eur'));

    expect(result).toStrictEqual(['paypal', 'klarna', 'apple_pay', 'google_pay', 'card']);
  });

  it('When a method is not eligible for the plan, then it is dropped but the wallets remain', () => {
    const result = getPaymentMethodOrder('US', buildPlan('lifetime', 'usd'));

    expect(result).toStrictEqual(['apple_pay', 'google_pay', 'paypal', 'card']);
  });

  it('When billing in local currency, then the local method leads and wallets keep their spot', () => {
    const result = getPaymentMethodOrder('BR', buildPlan('year', 'brl'));

    expect(result).toStrictEqual(['pix', 'apple_pay', 'google_pay', 'card', 'paypal']);
  });
});
