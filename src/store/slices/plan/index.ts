import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../..';
import { IUserPlan } from '../../../models/interfaces';
import configService from '../../../services/config.service';
import limitService from '../../../services/limit.service';

interface PlanState {
  currentPlan: IUserPlan | null;
  isLoadingStripe: boolean;
  isLoading: boolean;
  planLimit: number;
}

const initialState: PlanState = {
  currentPlan: null,
  isLoadingStripe: true,
  isLoading: false,
  planLimit: 0
};

export const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'plan/initialize',
  async (payload: void, { dispatch, getState }) => {
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
    setUserPlan: (state: PlanState, action: PayloadAction<IUserPlan>) => {
      state.currentPlan = action.payload;
    },
    setIsLoadingStripePlan: (state: PlanState, action: PayloadAction<boolean>) => {
      state.isLoadingStripe = action.payload;
    },
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
  hasLifetimePlan: (state: RootState): boolean => (state.plan.currentPlan === null && state.plan.planLimit > configService.getAppConfig().plan.freePlanStorageLimit)
};

export default planSlice.reducer;