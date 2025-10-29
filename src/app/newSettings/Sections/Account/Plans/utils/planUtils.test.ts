import { describe, it, expect, vi } from 'vitest';
import {
  determineSubscriptionChangeType,
  displayAmount,
  getCurrentUsage,
  getPlanInfo,
  getPlanName,
  getRenewalPeriod,
} from './planUtils';
import { DisplayPrice, RenewalPeriod, UserSubscription } from '@internxt/sdk/dist/drive/payments/types/types';
import { UsageResponseV2 } from '@internxt/sdk/dist/drive/storage/types';

vi.mock('i18next', () => ({
  t: vi.fn((key: string) => key),
}));

vi.mock('app/payment/services/currency.service', () => ({
  default: {
    getCurrencySymbol: vi.fn((currency: string) => (currency === 'eur' ? '€' : '$')),
  },
}));

vi.mock('app/drive/services/size.service', () => ({
  bytesToString: vi.fn((bytes: number) => `${bytes}B`),
}));

describe('planUtils', () => {
  describe('displayAmount', () => {
    it('should convert cents to currency with custom decimal points', () => {
      expect(displayAmount(1999)).toBe('19.99');
      expect(displayAmount(1999, 0)).toBe('20');
    });
  });

  describe('getCurrentUsage', () => {
    it('should return total usage or -1 when null', () => {
      expect(getCurrentUsage({ total: 500000 } as UsageResponseV2)).toBe(500000);
      expect(getCurrentUsage(null)).toBe(-1);
    });
  });

  describe('getRenewalPeriod', () => {
    it('should map renewal periods correctly', () => {
      expect(getRenewalPeriod(RenewalPeriod.Monthly)).toBe('month');
      expect(getRenewalPeriod(RenewalPeriod.Annually)).toBe('year');
      expect(getRenewalPeriod(RenewalPeriod.Lifetime)).toBe('lifetime');
      expect(getRenewalPeriod()).toBe(null);
    });
  });

  describe('getPlanName', () => {
    it('should return plan name from different sources', () => {
      expect(getPlanName({ simpleName: '200 GB' } as any)).toBe('200 GB');
      expect(getPlanName(null, 1024)).toBe('1024B');
      expect(getPlanName(null)).toBe('1GB');
    });
  });

  describe('getPlanInfo', () => {
    it('should format plan info for different intervals', () => {
      const annualPlan = { price: 49.99, currency: 'eur', paymentInterval: RenewalPeriod.Annually } as any;
      expect(getPlanInfo(annualPlan)).toContain('49.99');

      const monthlyPlan = { monthlyPrice: 9.99, currency: 'usd', paymentInterval: RenewalPeriod.Monthly } as any;
      expect(getPlanInfo(monthlyPlan)).toContain('9.99');

      expect(getPlanInfo(null)).toBe('views.account.tabs.billing.cancelSubscriptionModal.infoBox.free');
    });
  });

  describe('determineSubscriptionChangeType', () => {
    it('should return "free" for free to free', () => {
      const result = determineSubscriptionChangeType({
        priceSelected: {} as DisplayPrice,
        currentUserSubscription: { type: 'free' } as UserSubscription,
        planLimit: 0,
        isFreePriceSelected: true,
        currentPlanRenewalInterval: null,
      });
      expect(result).toBe('free');
    });

    it('should return "upgrade" when selecting larger storage', () => {
      const result = determineSubscriptionChangeType({
        priceSelected: { interval: 'month', bytes: 200 * 1024 ** 3 } as DisplayPrice,
        currentUserSubscription: { type: 'subscription' } as UserSubscription,
        planLimit: 100 * 1024 ** 3,
        isFreePriceSelected: false,
        currentPlanRenewalInterval: 'month',
      });
      expect(result).toBe('upgrade');
    });

    it('should return "downgrade" when selecting smaller storage', () => {
      const result = determineSubscriptionChangeType({
        priceSelected: { interval: 'month', bytes: 100 * 1024 ** 3 } as DisplayPrice,
        currentUserSubscription: { type: 'subscription' } as UserSubscription,
        planLimit: 200 * 1024 ** 3,
        isFreePriceSelected: false,
        currentPlanRenewalInterval: 'month',
      });
      expect(result).toBe('downgrade');
    });

    it('should return "upgrade" when switching from month to year with same storage', () => {
      const result = determineSubscriptionChangeType({
        priceSelected: { interval: 'year', bytes: 100 * 1024 ** 3 } as DisplayPrice,
        currentUserSubscription: { type: 'subscription' } as UserSubscription,
        planLimit: 100 * 1024 ** 3,
        isFreePriceSelected: false,
        currentPlanRenewalInterval: 'month',
      });
      expect(result).toBe('upgrade');
    });

    it('should return "manageBilling" when same storage and interval', () => {
      const result = determineSubscriptionChangeType({
        priceSelected: { interval: 'month', bytes: 100 * 1024 ** 3 } as DisplayPrice,
        currentUserSubscription: { type: 'subscription' } as UserSubscription,
        planLimit: 100 * 1024 ** 3,
        isFreePriceSelected: false,
        currentPlanRenewalInterval: 'month',
      });
      expect(result).toBe('manageBilling');
    });

    it('should return "upgrade" for lifetime to larger lifetime', () => {
      const result = determineSubscriptionChangeType({
        priceSelected: { interval: 'lifetime', bytes: 500 * 1024 ** 3 } as DisplayPrice,
        currentUserSubscription: { type: 'lifetime' } as UserSubscription,
        planLimit: 200 * 1024 ** 3,
        isFreePriceSelected: false,
        currentPlanRenewalInterval: 'lifetime',
      });
      expect(result).toBe('upgrade');
    });
  });
});
