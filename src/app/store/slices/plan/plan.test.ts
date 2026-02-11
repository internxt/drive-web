import { describe, it, expect, test } from 'vitest';
import { planSelectors, PlanState, planSlice, planActions } from './index';
import { RootState } from '../..';
import { StoragePlan, RenewalPeriod } from '@internxt/sdk/dist/drive/payments/types/types';

const mockIndividualPlan: StoragePlan = {
  planId: 'individual-plan-123',
  productId: 'product-123',
  name: 'Individual Plan',
  simpleName: 'Individual',
  paymentInterval: RenewalPeriod.Monthly,
  price: 100,
  monthlyPrice: 10,
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
  paymentInterval: RenewalPeriod.Monthly,
  price: 500,
  monthlyPrice: 50,
  currency: 'USD',
  isTeam: true,
  isLifetime: false,
  renewalPeriod: RenewalPeriod.Monthly,
  storageLimit: 5000000000,
  amountOfSeats: 5,
};

const createMockState = (planState: Partial<PlanState>, hasSelectedWorkspace = false): Partial<RootState> => ({
  plan: {
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
    ...planState,
  },
  workspaces: {
    selectedWorkspace: hasSelectedWorkspace
      ? ({
          workspace: { id: 'workspace-123', name: 'Test Workspace' },
          workspaceUser: {},
          role: 'OWNER',
        } as unknown as RootState['workspaces']['selectedWorkspace'])
      : null,
  } as RootState['workspaces'],
});

describe('Plan Selectors', () => {
  describe('currentPlan', () => {
    it('should return businessPlan when selectedWorkspace exists', () => {
      const state = createMockState(
        {
          individualPlan: mockIndividualPlan,
          businessPlan: mockBusinessPlan,
        },
        true,
      ) as RootState;

      const result = planSelectors.currentPlan(state);

      expect(result).toBe(mockBusinessPlan);
    });

    it('should return individualPlan when selectedWorkspace does not exist', () => {
      const state = createMockState(
        {
          individualPlan: mockIndividualPlan,
          businessPlan: mockBusinessPlan,
        },
        false,
      ) as RootState;

      const result = planSelectors.currentPlan(state);

      expect(result).toBe(mockIndividualPlan);
    });

    it('should return null when individualPlan is null and no workspace is selected', () => {
      const state = createMockState(
        {
          individualPlan: null,
        },
        false,
      ) as RootState;

      const result = planSelectors.currentPlan(state);

      expect(result).toBeNull();
    });
  });

  describe('isPlanActive', () => {
    it('should return true when individualPlan.planId matches the provided priceId', () => {
      const state = createMockState({
        individualPlan: mockIndividualPlan,
      }) as RootState;

      const result = planSelectors.isPlanActive(state)('individual-plan-123');

      expect(result).toBe(true);
    });

    it('should return false when individualPlan.planId does not match the provided priceId', () => {
      const state = createMockState({
        individualPlan: mockIndividualPlan,
      }) as RootState;

      const result = planSelectors.isPlanActive(state)('different-plan-id');

      expect(result).toBe(false);
    });

    it('should return false when individualPlan is null', () => {
      const state = createMockState({
        individualPlan: null,
      }) as RootState;

      const result = planSelectors.isPlanActive(state)('any-plan-id');

      expect(result).toBe(false);
    });
  });
});

describe('Plan Reducers', () => {
  describe('Update Limit plan', () => {
    test('When providing a max space bytes, then should update the plan limit and stop loading the plan limit', () => {
      const initialState: PlanState = {
        isLoadingPlanLimit: true,
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
      };

      const newLimit = 5000000000;
      const result = planSlice.reducer(initialState, planActions.updatePlanLimit(newLimit));

      expect(result.planLimit).toStrictEqual(newLimit);
      expect(result.isLoadingPlanLimit).toStrictEqual(false);
    });

    test('When there is no max space bytes, then should not update the user plan limit', () => {
      const initialState: PlanState = {
        isLoadingPlanLimit: true,
        isLoadingPlanUsage: false,
        isLoadingBusinessLimitAndUsage: false,
        individualPlan: null,
        businessPlan: null,
        planLimit: 1000000000,
        planUsage: 0,
        usageDetails: null,
        individualSubscription: null,
        businessSubscription: null,
        businessPlanLimit: 0,
        businessPlanUsage: 0,
        businessPlanUsageDetails: null,
      };

      const result = planSlice.reducer(initialState, planActions.updatePlanLimit(null));

      expect(result.planLimit).toStrictEqual(initialState.planLimit);
      expect(result.isLoadingPlanLimit).toStrictEqual(true);
    });
  });
});
