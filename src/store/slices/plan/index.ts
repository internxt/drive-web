import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../..';
import configService from '../../../services/config.service';
import limitService from '../../../services/limit.service';
import { selectorIsTeam } from '../team';

interface PlanState {
  isLoading: boolean;
  planLimit: number;
}

const initialState: PlanState = {
  isLoading: false,
  planLimit: 0
};

export const initializeThunk = createAsyncThunk(
  'plan/initialize',
  async (payload: void, { dispatch, getState }: any) => {
    const isAuthenticated = getState().user.isAuthenticated;

    if (isAuthenticated) {
      const planLimit = await limitService.fetchLimit();

      dispatch(setPlanLimit(planLimit));
    }
  }
);

export const planSlice = createSlice({
  name: 'plan',
  initialState,
  reducers: {
    setPlanLimit: (state: PlanState, action: PayloadAction<number>) => {
      state.planLimit = action.payload;
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
  setPlanLimit
} = planSlice.actions;
export const planActions = planSlice.actions;

export const planThunks = {
  initializeThunk
};

export const planSelectors = {
  hasLifetimePlan: (state: RootState): boolean => (state.user.currentPlan === null && state.plan.planLimit > configService.getAppConfig().plan.freePlanStorageLimit)
};

export default planSlice.reducer;