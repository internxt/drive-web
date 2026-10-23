import { describe, it, expect } from 'vitest';
import { planSelectors, PlanState } from './index';
import { RootState } from '../..';
import { StoragePlan } from '@internxt/sdk/dist/drive/payments/types/types';
import { getPlanState, getStoragePlan } from 'testUtils/fixtures/plan.fixtures';

const mockIndividualPlan: StoragePlan = getStoragePlan({
  planId: 'individual-plan-123',
  productId: 'product-123',
  name: 'Individual Plan',
  simpleName: 'Individual',
  price: 100,
  monthlyPrice: 10,
  currency: 'USD',
  storageLimit: 1000000000,
});

const mockBusinessPlan: StoragePlan = getStoragePlan({
  planId: 'business-plan-456',
  productId: 'product-456',
  name: 'Business Plan',
  simpleName: 'Business',
  price: 500,
  monthlyPrice: 50,
  currency: 'USD',
  isTeam: true,
  storageLimit: 5000000000,
  cancellationTrial: { redeemed: false },
  amountOfSeats: 5,
});

const createMockState = (planState: Partial<PlanState>, hasSelectedWorkspace = false): Partial<RootState> => ({
  plan: getPlanState(planState),
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
