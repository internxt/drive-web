import { CouponCodeData } from '@internxt/sdk/dist/drive/payments/types/types';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { Translate } from 'app/i18n/types';
import { describe, expect, it } from 'vitest';
import { getUrgentCheckoutPlanSummary } from './getUrgentCheckoutPlanSummary';

const BYTES_IN_5TB = 5497558138880;
const ONE_TERABYTE_IN_BYTES = 1099511627776;

const translateMock = ((key: string, props?: Record<string, unknown>) => {
  const translations: Record<string, string> = {
    'preferences.account.plans.planFeaturesList.5TB.title': 'Ultimate',
    'checkout.productCard.renewalTitle.month': 'annual',
    'checkout.productCard.billed.month': 'Billed monthly',
  };

  return translations[key] ?? `${key}${props ? JSON.stringify(props) : ''}`;
}) as unknown as Translate;

const getPlan = (decimalAmount: number, decimalAmountWithTax: number): PriceWithTax =>
  ({
    price: {
      id: 'price_id',
      bytes: BYTES_IN_5TB,
      currency: 'usd',
      decimalAmount,
      interval: 'month',
    },
    taxes: {
      decimalAmountWithTax,
    },
  }) as unknown as PriceWithTax;

const percentOffCoupon: CouponCodeData = {
  percentOff: 94,
  amountOff: undefined,
  codeId: 'code_id',
  codeName: 'OFFER94',
};

describe('Building the urgent checkout summary', () => {
  it('When a percentage coupon is applied, then the discounted price, tax, total and savings are derived from the plan', () => {
    const summary = getUrgentCheckoutPlanSummary(getPlan(29.99, 2.18), translateMock, percentOffCoupon);

    expect(summary.storage).toBe('5TB');
    expect(summary.planLabel).toBe('Ultimate — annual');
    expect(summary.billedLabel).toBe('Billed monthly');
    expect(summary.currencySymbol).toBe('$');
    expect(summary.normalAmount).toBe('29.99');
    expect(summary.discountedAmount).toBe('1.79');
    expect(summary.taxAmount).toBe('0.39');
    expect(summary.totalAmount).toBe('2.18');
    expect(summary.savingsAmount).toBe('28.20');
    expect(summary.discountPercent).toBe(94);
    expect(summary.isRecurring).toBe(true);
  });

  it('When no coupon is applied, then there is no discount and no savings', () => {
    const summary = getUrgentCheckoutPlanSummary(getPlan(29.99, 36.29), translateMock);

    expect(summary.discountPercent).toBeUndefined();
    expect(summary.discountedAmount).toBe('29.99');
    expect(summary.savingsAmount).toBe('0');
    expect(summary.taxAmount).toBe('6.30');
  });

  it('When the coupon has a fixed amount off, then the discount percentage is derived from the amounts', () => {
    const amountOffCoupon: CouponCodeData = {
      percentOff: undefined,
      amountOff: 1500,
      codeId: 'code_id',
      codeName: 'OFFER15',
    };

    const summary = getUrgentCheckoutPlanSummary(getPlan(30, 15), translateMock, amountOffCoupon);

    expect(summary.discountedAmount).toBe('15');
    expect(summary.discountPercent).toBe(50);
  });

  it('When the plan name has no specific translation, then the storage is used as the plan name', () => {
    const plan = getPlan(9.99, 9.99);
    plan.price.bytes = ONE_TERABYTE_IN_BYTES;

    const summary = getUrgentCheckoutPlanSummary(plan, translateMock);

    expect(summary.planLabel).toContain('preferences.account.plans.planFeaturesList.default.bytesTitle');
  });

  it('When the currency has no symbol mapped, then the summary exposes an empty symbol', () => {
    const plan = getPlan(29.99, 2.18);
    const planInUnknownCurrency = { ...plan, price: { ...plan.price, currency: 'xyz' } };

    const summary = getUrgentCheckoutPlanSummary(planInUnknownCurrency, translateMock);

    expect(summary.currencySymbol).toBe('');
  });

  it('When the plan costs nothing, then there is no discount percentage', () => {
    const summary = getUrgentCheckoutPlanSummary(getPlan(0, 0), translateMock);

    expect(summary.discountPercent).toBeUndefined();
    expect(summary.savingsAmount).toBe('0');
  });
});
