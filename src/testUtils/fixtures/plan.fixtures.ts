import { RenewalPeriod, StoragePlan } from '@internxt/sdk/dist/drive/payments/types/types';
import { PlanState } from 'app/store/slices/plan';

export const getStoragePlan = (overrides: Partial<StoragePlan> = {}): StoragePlan => ({
  planId: 'price_1PNxYtFAOdcgaBMQzkimr6OU',
  productId: 'product-id',
  name: 'Plan',
  simpleName: 'Pro',
  paymentInterval: RenewalPeriod.Monthly,
  price: 0,
  monthlyPrice: 0,
  currency: 'eur',
  isTeam: false,
  isLifetime: false,
  renewalPeriod: RenewalPeriod.Monthly,
  storageLimit: 0,
  amountOfSeats: 1,
  seats: { minimumSeats: 1, maximumSeats: 1 },
  commitment: { enabled: false },
  cancellation: {
    scheduled: false,
  },
  cancellationTrial: {
    redeemed: false,
  },
  ...overrides,
});

export const getPlanState = (overrides: Partial<PlanState> = {}): PlanState => ({
  isLoadingPlanLimit: false,
  isLoadingPlanUsage: false,
  isLoadingBusinessLimitAndUsage: false,
  individualPlan: null,
  businessPlan: null,
  planLimit: 0,
  planUsage: 0,
  usageDetails: null,
  individualSubscription: null,
  businessSubscription: null,
  businessPlanLimit: 0,
  businessPlanUsage: 0,
  businessPlanUsageDetails: null,
  ...overrides,
});
