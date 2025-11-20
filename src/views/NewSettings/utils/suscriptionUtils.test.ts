import { describe, it, expect, vi } from 'vitest';
import { getSubscriptionData } from './suscriptionUtils';
import { UserSubscription, UserType, StoragePlan, RenewalPeriod } from '@internxt/sdk/dist/drive/payments/types/types';
import { PlanState } from 'app/store/slices/plan';

vi.mock('i18next', () => ({
  t: (key: string) => {
    if (key === 'views.account.tabs.billing.cancelSubscriptionModal.infoBox.month') return 'month';
    if (key === 'views.account.tabs.billing.cancelSubscriptionModal.infoBox.year') return 'year';
    if (key === 'views.account.tabs.billing.cancelSubscriptionModal.infoBox.free') return 'Free';
    return key;
  },
}));

vi.mock('views/Checkout/services', () => ({
  currencyService: {
    getCurrencySymbol: (currency: string) => {
      if (currency === 'USD') return '$';
      if (currency === 'EUR') return '€';
      return currency;
    },
  },
  paymentService: {},
  authCheckoutService: {},
  checkoutService: {},
  fetchProducts: vi.fn(),
  ProductService: {},
}));

const mockIndividualPlan: StoragePlan = {
  planId: 'individual-plan-123',
  productId: 'product-123',
  name: 'Individual Plan',
  simpleName: 'Individual',
  paymentInterval: RenewalPeriod.Monthly,
  price: 100,
  monthlyPrice: 9.99,
  currency: 'USD',
  isTeam: false,
  isLifetime: false,
  renewalPeriod: RenewalPeriod.Monthly,
  storageLimit: 1000000000,
  amountOfSeats: 1,
};

const mockBusinessPlan: StoragePlan = {
  planId: 'business-plan-456',
  productId: 'product-456',
  name: 'Business Plan',
  simpleName: 'Business',
  paymentInterval: RenewalPeriod.Annually,
  price: 499,
  monthlyPrice: 49.99,
  currency: 'EUR',
  isTeam: true,
  isLifetime: false,
  renewalPeriod: RenewalPeriod.Annually,
  storageLimit: 5000000000,
  amountOfSeats: 5,
};

const mockIndividualSubscription: UserSubscription = {
  type: 'subscription',
  nextPayment: Math.floor(new Date('2024-12-25').getTime() / 1000),
  interval: 'month',
  subscriptionId: 'sub_123',
  amount: 999,
  currency: 'USD',
  priceId: 'price_123',
  userType: UserType.Individual,
};

const mockBusinessSubscription: UserSubscription = {
  type: 'subscription',
  nextPayment: Math.floor(new Date('2024-12-25').getTime() / 1000),
  interval: 'year',
  subscriptionId: 'sub_456',
  amount: 49900,
  currency: 'EUR',
  priceId: 'price_456',
  userType: UserType.Business,
};

const createMockPlanState = (
  individualPlan: StoragePlan | null = null,
  businessPlan: StoragePlan | null = null,
): PlanState => ({
  isLoadingPlanLimit: false,
  isLoadingPlanUsage: false,
  isLoadingBusinessLimitAndUsage: false,
  individualPlan,
  businessPlan,
  planLimit: 0,
  planUsage: 0,
  usageDetails: null,
  individualSubscription: null,
  businessSubscription: null,
  businessPlanLimit: 0,
  businessPlanUsage: 0,
  businessPlanUsageDetails: null,
});

describe('getSubscriptionData', () => {
  describe('userType selection logic', () => {
    it('should use individualPlan when userType is Individual', () => {
      const plan = createMockPlanState(mockIndividualPlan, mockBusinessPlan);

      const result = getSubscriptionData({
        userSubscription: mockIndividualSubscription,
        plan,
        local: 'en-US',
        userType: UserType.Individual,
      });

      expect(result).toBeDefined();
      expect(result?.amountInterval).toContain('9.99');
      expect(result?.interval).toBe('monthly');
    });

    it('should use businessPlan when userType is Business', () => {
      const plan = createMockPlanState(mockIndividualPlan, mockBusinessPlan);

      const result = getSubscriptionData({
        userSubscription: mockBusinessSubscription,
        plan,
        local: 'en-US',
        userType: UserType.Business,
      });

      expect(result).toBeDefined();
      expect(result?.amountInterval).toContain('499');
      expect(result?.interval).toBe('yearly');
    });

    it('should return undefined when userSubscription is null', () => {
      const plan = createMockPlanState(mockIndividualPlan);

      const result = getSubscriptionData({
        userSubscription: null,
        plan,
        local: 'en-US',
        userType: UserType.Individual,
      });

      expect(result).toBeUndefined();
    });
  });
});
