import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { RootState } from '../..';
import { IUserPlan } from '../../../models/interfaces';
import configService from '../../../services/config.service';
import limitService from '../../../services/limit.service';
import { fetchUserPlan } from '../../../services/user.service';

interface PlanState {
  isLoadingCurrentPlan: boolean;
  isLoadingPlanLimit: boolean;
  currentPlan: IUserPlan | null;
  planLimit: number;
}

const initialState: PlanState = {
  isLoadingCurrentPlan: false,
  isLoadingPlanLimit: false,
  currentPlan: null,
  planLimit: 0
};

export const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'plan/initialize',
  async (payload: void, { dispatch, getState }) => {
    const promises: Promise<void>[] = [];

    promises.push(dispatch(fetchCurrentPlanThunk()).then());
    promises.push(dispatch(fetchLimitThunk()).then());

    await Promise.all(promises);
  }
);

export const fetchCurrentPlanThunk = createAsyncThunk<IUserPlan | null, void, { state: RootState }>(
  'plan/fetchCurrentPlan',
  async (payload: void, { dispatch, getState }) => {
    const currentPlan = await fetchUserPlan();

    return currentPlan;
  }
);

export const fetchLimitThunk = createAsyncThunk<number, void, { state: RootState }>(
  'plan/fetchLimit',
  async (payload: void, { dispatch, getState }) => {
    const isAuthenticated = getState().user.isAuthenticated;
    let planLimit = 0;

    if (isAuthenticated) {
      planLimit = await limitService.fetchLimit();
    }

    return planLimit;
  }
);

export const planSlice = createSlice({
  name: 'plan',
  initialState,
  reducers: { },
  extraReducers: (builder) => {
    builder
      .addCase(initializeThunk.pending, (state, action) => { })
      .addCase(initializeThunk.fulfilled, (state, action) => { })
      .addCase(initializeThunk.rejected, (state, action) => { });

    builder
      .addCase(fetchCurrentPlanThunk.pending, (state, action) => {
        state.isLoadingCurrentPlan = true;
      })
      .addCase(fetchCurrentPlanThunk.fulfilled, (state, action) => {
        state.isLoadingCurrentPlan = false;
        state.currentPlan = action.payload;
      })
      .addCase(fetchCurrentPlanThunk.rejected, (state, action) => {
        state.isLoadingCurrentPlan = false;
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
  }
});

export const planActions = planSlice.actions;

export const planThunks = {
  initializeThunk,
  fetchCurrentPlanThunk,
  fetchLimitThunk
};

export const planSelectors = {
  hasLifetimePlan: (state: RootState): boolean => (state.plan.currentPlan === null && state.plan.planLimit > configService.getAppConfig().plan.freePlanStorageLimit)
};

export default planSlice.reducer;