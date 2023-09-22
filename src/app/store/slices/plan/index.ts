import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

import { RootState } from '../..';
import { StoragePlan } from 'app/drive/types';
import limitService from 'app/drive/services/limit.service';
import planService from 'app/drive/services/plan.service';
import usageService from 'app/drive/services/usage.service';
import { sessionSelectors } from '../session/session.selectors';
import { UsageResponse } from '@internxt/sdk/dist/drive/storage/types';
import { UserSubscription } from '@internxt/sdk/dist/drive/payments/types';
import paymentService from '../../../payment/services/payment.service';

export interface PlanState {
  isLoadingPlans: boolean;
  isLoadingPlanLimit: boolean;
  isLoadingPlanUsage: boolean;
  individualPlan: StoragePlan | null;
  teamPlan: StoragePlan | null;
  planLimit: number;
  planUsage: number;
  usageDetails: UsageResponse | null;
  subscription: UserSubscription | null;
}

interface FetchPlansResult {
  individualPlan: StoragePlan | null;
  teamPlan: StoragePlan | null;
}

const initialState: PlanState = {
  isLoadingPlans: false,
  isLoadingPlanLimit: false,
  isLoadingPlanUsage: false,
  individualPlan: null,
  teamPlan: null,
  planLimit: 0,
  planUsage: 0,
  usageDetails: null,
  subscription: null,
};

export const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'plan/initialize',
  async (payload: void, { dispatch, getState }) => {
    const isAuthenticated = getState().user.isAuthenticated;
    const promises: Promise<void>[] = [];

    if (isAuthenticated) {
      promises.push(dispatch(fetchPlans()).then());
      promises.push(dispatch(fetchLimitThunk()).then());
      promises.push(dispatch(fetchUsageThunk()).then());
      promises.push(dispatch(fetchSubscriptionThunk()).then());
    }

    await Promise.all(promises);
  },
);

export const fetchPlans = createAsyncThunk<FetchPlansResult, void, { state: RootState }>(
  'plan/fetchPlans',
  async (payload: void, { getState }) => {
    const user = getState().user.user;
    const promises: Promise<StoragePlan | null>[] = [];

    promises.push(planService.fetchIndividualPlan());
    if (user?.teams) {
      promises.push(planService.fetchTeamPlan());
    }

    const [individualPlan, teamPlan] = await Promise.all(promises);

    return { individualPlan, teamPlan };
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

export const fetchUsageThunk = createAsyncThunk<UsageResponse | null, void, { state: RootState }>(
  'plan/fetchUsage',
  async (payload: void, { getState }) => {
    const isAuthenticated = getState().user.isAuthenticated;

    if (isAuthenticated) {
      return await usageService.fetchUsage();
    } else {
      return null;
    }
  },
);

export const fetchSubscriptionThunk = createAsyncThunk<UserSubscription | null, void, { state: RootState }>(
  'plan/fetchSubscription',
  async (payload: void, { getState }) => {
    const isAuthenticated = getState().user.isAuthenticated;

    if (isAuthenticated) {
      return paymentService.getUserSubscription();
    } else {
      return null;
    }
  },
);

export const planSlice = createSlice({
  name: 'plan',
  initialState,
  reducers: {
    setSubscription: (state: PlanState, action: PayloadAction<UserSubscription>) => {
      state.subscription = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeThunk.pending, () => undefined)
      .addCase(initializeThunk.fulfilled, () => undefined)
      .addCase(initializeThunk.rejected, () => undefined);

    builder
      .addCase(fetchPlans.pending, (state) => {
        state.isLoadingPlans = true;
      })
      .addCase(fetchPlans.fulfilled, (state, action) => {
        state.isLoadingPlans = false;
        state.individualPlan = action.payload.individualPlan;
        state.teamPlan = action.payload.teamPlan;
      })
      .addCase(fetchPlans.rejected, (state) => {
        state.isLoadingPlans = false;
      });

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
        state.subscription = action.payload;
      }
    });
  },
});

const currentPlanSelector = (state: RootState): StoragePlan | null => {
  const isTeam = sessionSelectors.isTeam(state);

  return isTeam ? state.plan.teamPlan : state.plan.individualPlan;
};

export const planSelectors = {
  currentPlan: currentPlanSelector,
  isCurrentPlanLifetime: (state: RootState): boolean => {
    const currentPlan = currentPlanSelector(state);

    return currentPlan !== null && currentPlan.isLifetime;
  },
  planLimitToShow: (state: RootState): number => {
    const isTeam = sessionSelectors.isTeam(state);
    const team = state.team.team;
    const limit = isTeam ? state.plan.planLimit / (team?.total_members || 1) : state.plan.planLimit;

    return limit;
  },
  isPlanActive:
    (state: RootState) =>
    (priceId: string): boolean =>
      state.plan.individualPlan?.planId === priceId || state.plan.teamPlan?.planId === priceId,
};

export const planActions = planSlice.actions;

export const planThunks = {
  initializeThunk,
  fetchPlans,
  fetchLimitThunk,
  fetchUsageThunk,
  fetchSubscriptionThunk,
};

export default planSlice.reducer;
