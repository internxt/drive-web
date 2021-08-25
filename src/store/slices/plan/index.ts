import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../..';
import { Workspace } from '../../../models/enums';
import configService from '../../../services/config.service';
import limitService from '../../../services/limit.service';
import usageService from '../../../services/usage.service';

export interface PlanState {
  isLoading: boolean;
  limit: number;
  usage: number;
}

const initialState: PlanState = {
  isLoading: false,
  limit: 0,
  usage: 0
};

export const initializeThunk = createAsyncThunk(
  'plan/initialize',
  async (payload: void, { dispatch, getState }: any) => {
    const isAuthenticated = getState().user.isAuthenticated;
    const isTeam = getState().team.workspace !== Workspace.Personal;

    if (isAuthenticated) {
      const [planLimit, usageResponse] = await Promise.all([limitService.fetchLimit(), usageService.fetchUsage(isTeam)]);

      dispatch(setPlanLimit(planLimit));
      dispatch(setUsage(usageResponse.total));
    }
  }
);

export const planSlice = createSlice({
  name: 'plan',
  initialState,
  reducers: {
    setPlanLimit: (state: PlanState, action: PayloadAction<number>) => {
      state.limit = action.payload;
    },
    setUsage: (state: PlanState, action: PayloadAction<number>) => {
      state.usage = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeThunk.pending, (state, action) => {
        state.isLoading = true;
      })
      .addCase(initializeThunk.fulfilled, (state, action) => {
        state.isLoading = false;
      })
      .addCase(initializeThunk.rejected, (state, action) => {
        state.isLoading = false;
      });
  }
});

export const {
  setPlanLimit,
  setUsage
} = planSlice.actions;
export const planActions = planSlice.actions;

export const planThunks = {
  initializeThunk
};

export const planSelectors = {
  hasLifetimePlan: (state: RootState): boolean => (state.user.currentPlan === null && state.plan.limit > configService.getAppConfig().plan.freePlanStorageLimit)
};

export default planSlice.reducer;