import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { StoragePlan, UserSubscription, UserType } from '@internxt/sdk/dist/drive/payments/types/types';
import { UsageResponseV2 } from '@internxt/sdk/dist/drive/storage/types';
import { GetMemberUsageResponse } from '@internxt/sdk/dist/workspaces';
import workspacesService from 'app/core/services/workspace.service';
import limitService from 'app/drive/services/limit.service';
import usageService from 'app/drive/services/usage.service';
import { RootState } from '../..';
import { paymentService } from 'views/Checkout/services';
import { FreeStoragePlan } from 'app/drive/types';

export interface PlanState {
  isLoadingPlanLimit: boolean;
  isLoadingPlanUsage: boolean;
  isLoadingBusinessLimitAndUsage: boolean;
  individualPlan: StoragePlan | null;
  businessPlan: StoragePlan | null;
  planLimit: number;
  planUsage: number;
  usageDetails: UsageResponseV2 | null;
  individualSubscription: UserSubscription | null;
  businessSubscription: UserSubscription | null;
  businessPlanLimit: number;
  businessPlanUsage: number;
  businessPlanUsageDetails: UsageResponseV2 | null;
}

const initialState: PlanState = {
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
};

export const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'plan/initialize',
  async (payload: void, { dispatch, getState }) => {
    const isAuthenticated = getState().user.isAuthenticated;
    const promises: Promise<void>[] = [];

    if (isAuthenticated) {
      promises.push(dispatch(fetchSubscriptionThunk({ userType: UserType.Individual })).then());
      promises.push(dispatch(fetchSubscriptionThunk({ userType: UserType.Business })).then());
      promises.push(dispatch(fetchLimitThunk()).then());
      promises.push(dispatch(fetchUsageThunk()).then());
      promises.push(dispatch(fetchBusinessLimitUsageThunk()).then());
    }

    await Promise.all(promises);
  },
);

export const fetchLimitThunk = createAsyncThunk<number, void, { state: RootState }>(
  'plan/fetchLimit',
  async (payload: void, { getState }) => {
    const isAuthenticated = getState().user.isAuthenticated;
    let limit = 0;

    if (isAuthenticated) {
      limit = await limitService.fetchLimit();
    }

    return limit;
  },
);

export const fetchUsageThunk = createAsyncThunk<UsageResponseV2 | null, void, { state: RootState }>(
  'plan/fetchUsage',
  async (payload: void, { getState }) => {
    const isAuthenticated = getState().user.isAuthenticated;

    if (isAuthenticated) {
      return usageService.fetchUsage();
    } else {
      return null;
    }
  },
);

export const fetchSubscriptionThunk = createAsyncThunk<
  UserSubscription | null,
  { userType: UserType },
  { state: RootState }
>('plan/fetchSubscription', async (payload, { getState }) => {
  const isAuthenticated = getState().user.isAuthenticated;

  if (isAuthenticated) {
    return paymentService.getUserSubscription(payload.userType);
  } else {
    return null;
  }
});

export const fetchBusinessLimitUsageThunk = createAsyncThunk<GetMemberUsageResponse | null, void, { state: RootState }>(
  'plan/fetchBusinessLimitUsage',
  async (payload: void, { getState }) => {
    const isAuthenticated = getState().user.isAuthenticated;
    const userUuid = getState().user.user?.uuid;

    if (isAuthenticated) {
      const { selectedWorkspace } = getState().workspaces;

      if (selectedWorkspace) {
        const workspaceId = selectedWorkspace?.workspace.id;
        if (workspaceId && userUuid) return workspacesService.getUsage(workspaceId);
      }
    }

    return null;
  },
);

export const planSlice = createSlice({
  name: 'plan',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(initializeThunk.pending, (state) => {
        state.businessPlan = null;
        state.businessPlanLimit = 0;
        state.businessPlanUsage = 0;
        state.businessPlanUsageDetails = null;
      })
      .addCase(initializeThunk.fulfilled, () => undefined)
      .addCase(initializeThunk.rejected, () => undefined);

    builder
      .addCase(fetchLimitThunk.pending, (state) => {
        state.isLoadingPlanLimit = true;
      })
      .addCase(fetchLimitThunk.fulfilled, (state, action) => {
        state.isLoadingPlanLimit = false;
        state.planLimit = action.payload;
      })
      .addCase(fetchLimitThunk.rejected, (state) => {
        state.isLoadingPlanLimit = false;
      });

    builder
      .addCase(fetchUsageThunk.pending, (state) => {
        state.isLoadingPlanUsage = true;
      })
      .addCase(fetchUsageThunk.fulfilled, (state, action) => {
        state.isLoadingPlanUsage = false;
        if (action.payload !== null) {
          state.planUsage = action.payload.total;
          state.usageDetails = action.payload;
        }
      })
      .addCase(fetchUsageThunk.rejected, (state) => {
        state.isLoadingPlanUsage = false;
      });

    builder.addCase(fetchSubscriptionThunk.fulfilled, (state, action) => {
      if (action.payload !== null) {
        const isIndividualSubscription = action.meta.arg.userType == UserType.Individual;

        if (isIndividualSubscription) {
          state.individualSubscription = action.payload;
          if (action.payload.type === 'subscription') {
            state.individualPlan = action.payload.plan || null;
          }
        }
        if (!isIndividualSubscription) {
          state.businessSubscription = action.payload;
          if (action.payload.type === 'subscription') {
            state.businessPlan = action.payload.plan || null;
          }
        }
      }
    });

    builder
      .addCase(fetchBusinessLimitUsageThunk.pending, (state) => {
        state.isLoadingBusinessLimitAndUsage = true;
      })
      .addCase(fetchBusinessLimitUsageThunk.fulfilled, (state, action) => {
        const spaceLimit = Number(action.payload?.spaceLimit) || 0;
        const driveUsage = Number(action.payload?.driveUsage) || 0;
        const backupsUsage = Number(action.payload?.backupsUsage) || 0;

        state.businessPlanLimit = spaceLimit;
        state.businessPlanUsage = driveUsage + backupsUsage;
        state.businessPlanUsageDetails = {
          drive: driveUsage,
          backups: backupsUsage,
          total: driveUsage + backupsUsage,
        };
        state.isLoadingBusinessLimitAndUsage = false;
      })
      .addCase(fetchBusinessLimitUsageThunk.rejected, (state) => {
        state.isLoadingBusinessLimitAndUsage = false;
      });
  },
});

const currentPlanSelector = (state: RootState): StoragePlan | null => {
  const { selectedWorkspace } = state.workspaces;
  if (selectedWorkspace) return state.plan.businessPlan;

  return state.plan.individualPlan;
};

export const planSelectors = {
  currentPlan: currentPlanSelector,
  isCurrentPlanLifetime: (state: RootState): boolean => {
    const currentPlan = currentPlanSelector(state);

    return currentPlan !== null && currentPlan.isLifetime;
  },
  planLimitToShow: (state: RootState): number => {
    const { selectedWorkspace } = state.workspaces;
    if (selectedWorkspace) {
      const businessPlanLimit = state.plan.businessPlan ? state.plan.businessPlan.storageLimit : 0;
      return state.plan.businessPlanLimit || businessPlanLimit;
    }

    const individualPlanLimit = state.plan.individualPlan ? state.plan.individualPlan.storageLimit : 0;
    const limit = state.plan.planLimit || individualPlanLimit || FreeStoragePlan.storageLimit;

    return limit;
  },
  planUsageToShow: (state: RootState): number => {
    const { selectedWorkspace } = state.workspaces;
    if (selectedWorkspace) return state.plan.businessPlanUsage || 0;
    return state.plan.planUsage;
  },
  isPlanActive:
    (state: RootState) =>
    (priceId: string): boolean =>
      state.plan.individualPlan?.planId === priceId,
  subscriptionToShow: (state: RootState): UserSubscription | null => {
    const { selectedWorkspace } = state.workspaces;
    if (selectedWorkspace) return state.plan.businessSubscription;
    return state.plan.individualSubscription;
  },
};

export const planThunks = {
  initializeThunk,
  fetchLimitThunk,
  fetchUsageThunk,
  fetchSubscriptionThunk,
  fetchBusinessLimitUsageThunk,
};

export default planSlice.reducer;
