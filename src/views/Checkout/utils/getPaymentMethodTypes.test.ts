import { describe, expect, it } from 'vitest';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { getPaymentMethodOrder, getPaymentMethodTypes } from './getPaymentMethodTypes';

const buildPlan = (interval: string, currency: string): PriceWithTax =>
  ({
    price: { interval, currency },
  }) as unknown as PriceWithTax;

describe('Ordering payment methods by country', () => {
  it.each([
    {
      scenario: 'the country has a configured order, then the methods keep that order',
      country: 'ES' as string | undefined,
      expected: ['card', 'paypal', 'klarna'],
    },
    {
      scenario: 'the country is configured with a different priority, then that priority is respected',
      country: 'DE' as string | undefined,
      expected: ['paypal', 'klarna', 'card'],
    },
    {
      scenario: 'no country is provided, then it falls back to the default order',
      country: undefined,
      expected: ['card', 'paypal', 'klarna'],
    },
  ])('When $scenario', ({ country, expected }) => {
    const result = getPaymentMethodTypes(country, buildPlan('lifetime', 'eur'));

    expect(result).toStrictEqual(expected);
  });
});

describe('Filtering out payment methods that are not eligible for the plan', () => {
  it.each([
    {
      scenario: 'the plan is a recurring subscription, then Klarna is removed because it only supports one-time payments',
      country: 'ES',
      plan: buildPlan('year', 'eur'),
      expected: ['card', 'paypal'],
    },
    {
      scenario: 'a lifetime plan is billed in a currency where Klarna is not enabled, then Klarna is removed',
      country: 'US',
      plan: buildPlan('lifetime', 'usd'),
      expected: ['paypal', 'card'],
    },
    {
      scenario: 'Pix is preferred but the plan is not billed in Brazilian reais, then Pix is removed',
      country: 'BR',
      plan: buildPlan('year', 'eur'),
      expected: ['card', 'paypal'],
    },
    {
      scenario: 'the plan is billed in Brazilian reais, then Pix is offered first',
      country: 'BR',
      plan: buildPlan('year', 'brl'),
      expected: ['pix', 'card', 'paypal'],
    },
    {
      scenario: 'the plan is billed in Indian rupees, then UPI is offered first',
      country: 'IN',
      plan: buildPlan('year', 'inr'),
      expected: ['upi', 'card', 'paypal'],
    },
    {
      scenario: 'every preferred method is filtered out, then card is always kept as a fallback',
      country: 'IN',
      plan: buildPlan('year', 'eur'),
      expected: ['card', 'paypal'],
    },
  ])('When $scenario', ({ country, plan, expected }) => {
    const result = getPaymentMethodTypes(country, plan);

    expect(result).toStrictEqual(expected);
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
