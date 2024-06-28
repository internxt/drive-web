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
  businessPlan: StoragePlan | null;
  teamPlan: StoragePlan | null;
  planLimit: number;
  planUsage: number;
  usageDetails: UsageResponse | null;
  subscription: UserSubscription | null; //TODO: Please review this field, it may be necessary to remove it and use the field for each subscription separately
  subscriptionIndividual: UserSubscription | null;
  subscriptionBusiness: UserSubscription | null;
}

interface FetchPlansResult {
  individualPlan: StoragePlan | null;
  businessPlan: StoragePlan | null;
  teamPlan: StoragePlan | null;
}

const initialState: PlanState = {
  isLoadingPlans: false,
  isLoadingPlanLimit: false,
  isLoadingPlanUsage: false,
  individualPlan: null,
  businessPlan: null,
  teamPlan: null,
  planLimit: 0,
  planUsage: 0,
  usageDetails: null,
  subscription: null, //TODO: Please review this field, it may be necessary to remove it and use the field for each subscription separately
  subscriptionIndividual: null,
  subscriptionBusiness: null,
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
      promises.push(dispatch(fetchSubscriptionThunk({ type: 'individual' })).then());
      promises.push(dispatch(fetchSubscriptionThunk({ type: 'business' })).then());
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
    promises.push(planService.fetchBusinessPlan());
    if (user?.teams) {
      promises.push(planService.fetchTeamPlan());
    }

    const [individualPlan, businessPlan, teamPlan] = await Promise.all(promises);

    return { individualPlan, businessPlan, teamPlan };
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

export const fetchSubscriptionThunk = createAsyncThunk<
  UserSubscription | null,
  { type: 'individual' | 'business' },
  { state: RootState }
>('plan/fetchSubscription', async (payload, { getState }) => {
  const isAuthenticated = getState().user.isAuthenticated;

  if (isAuthenticated) {
    return paymentService.getUserSubscription(payload.type);
  } else {
    return null;
  }
});

export const planSlice = createSlice({
  name: 'plan',
  initialState,
  reducers: {
    setSubscription: (state: PlanState, action: PayloadAction<UserSubscription>) => {
      //TODO: Please review this field, it may be necessary to remove it and use the field for each subscription separately
      state.subscription = action.payload;
    },
    setSubscriptionIndividual: (state: PlanState, action: PayloadAction<UserSubscription>) => {
      state.subscriptionIndividual = action.payload;
    },
    setSubscriptionBusiness: (state: PlanState, action: PayloadAction<UserSubscription>) => {
      state.subscriptionBusiness = action.payload;
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
        state.businessPlan = action.payload.businessPlan;
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
        if (action.meta.arg.type == 'individual') state.subscriptionIndividual = action.payload;
        if (action.meta.arg.type == 'business') state.subscriptionBusiness = action.payload;
        //TODO: Please review this field, it may be necessary to remove it and use the field for each subscription separately
        state.subscription = action.payload;
      }
    });
  },
});
// TODO: review this behavior
const currentPlanSelector = (state: RootState): StoragePlan | null => {
  const isTeam = sessionSelectors.isTeam(state);

  return isTeam ? state.plan.teamPlan : state.plan.individualPlan;
};
// TODO: review this behavior
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
