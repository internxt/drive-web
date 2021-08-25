import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { RootState } from '../..';
import { StoragePlan } from '../../../models/interfaces';
import limitService from '../../../services/limit.service';
import planService from '../../../services/plan.service';
import usageService from '../../../services/usage.service';
import { sessionSelectors } from '../session/session.selectors';

export interface PlanState {
  isLoadingPlans: boolean;
  isLoadingPlanLimit: boolean;
  isLoadingPlanUsage: boolean;
  individualPlan: StoragePlan | null;
  teamPlan: StoragePlan | null;
  planLimit: number;
  planUsage: number;
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
  planUsage: 0
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
    }

    await Promise.all(promises);
  }
);

export const fetchPlans = createAsyncThunk<FetchPlansResult, void, { state: RootState }>(
  'plan/fetchPlans',
  async (payload: void, { dispatch, getState }) => {
    const user = getState().user.user;
    const promises: Promise<StoragePlan | null>[] = [];

    promises.push(planService.fetchIndividualPlan());
    if (user?.teams) {
      promises.push(planService.fetchTeamPlan());
    }

    const [individualPlan, teamPlan] = await Promise.all(promises);

    return { individualPlan, teamPlan };
  }
);

export const fetchLimitThunk = createAsyncThunk<number, void, { state: RootState }>(
  'plan/fetchLimit',
  async (payload: void, { dispatch, getState }) => {
    const isAuthenticated = getState().user.isAuthenticated;
    let limit = 0;

    if (isAuthenticated) {
      limit = await limitService.fetchLimit();
    }

    return limit;
  }
);

export const fetchUsageThunk = createAsyncThunk<number, void, { state: RootState }>(
  'plan/fetchUsage',
  async (payload: void, { dispatch, getState }) => {
    const isAuthenticated = getState().user.isAuthenticated;
    let usage = 0;

    if (isAuthenticated) {
      const usageResponse = await usageService.fetchUsage();

      usage = usageResponse.total;
    }

    return usage;
  }
);

export const planSlice = createSlice({
  name: 'plan',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(initializeThunk.pending, (state, action) => { })
      .addCase(initializeThunk.fulfilled, (state, action) => { })
      .addCase(initializeThunk.rejected, (state, action) => { });

    builder
      .addCase(fetchPlans.pending, (state, action) => {
        state.isLoadingPlans = true;
      })
      .addCase(fetchPlans.fulfilled, (state, action) => {
        state.isLoadingPlans = false;
        state.individualPlan = action.payload.individualPlan;
        state.teamPlan = action.payload.teamPlan;
      })
      .addCase(fetchPlans.rejected, (state, action) => {
        state.isLoadingPlans = false;
      });

    builder
      .addCase(fetchLimitThunk.pending, (state, action) => {
        state.isLoadingPlanLimit = true;
      })
      .addCase(fetchLimitThunk.fulfilled, (state, action) => {
        state.isLoadingPlanLimit = false;
        state.planLimit = action.payload;
      })
      .addCase(fetchLimitThunk.rejected, (state, action) => {
        state.isLoadingPlanLimit = false;
      });

    builder
      .addCase(fetchUsageThunk.pending, (state, action) => {
        state.isLoadingPlanUsage = true;
      })
      .addCase(fetchUsageThunk.fulfilled, (state, action) => {
        state.isLoadingPlanUsage = false;
        state.planUsage = action.payload;
      })
      .addCase(fetchUsageThunk.rejected, (state, action) => {
        state.isLoadingPlanUsage = false;
      });
  }
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
  }
};

export const planActions = planSlice.actions;

export const planThunks = {
  initializeThunk,
  fetchPlans,
  fetchLimitThunk,
  fetchUsageThunk
};

export default planSlice.reducer;