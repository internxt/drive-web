import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import desktopService from 'services/desktop.service';
import navigationService from 'services/navigation.service';
import usersReferralsService from 'app/referrals/services/users-referrals.service';

import { ReferralKey, UserReferral } from '@internxt/sdk/dist/drive/referrals/types';
import { t as translate } from 'i18next';
import { RootState } from 'app/store';
import { planThunks } from '../plan';
import { uiActions } from '../ui';
import { userSelectors } from '../user';

interface ReferralsState {
  isLoading: boolean;
  list: UserReferral[];
}

const initialState: ReferralsState = {
  isLoading: false,
  list: [],
};

const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'referrals/initialize',
  async (payload, { getState, dispatch }) => {
    const isAuthenticated = getState().user.isAuthenticated;
    const hasReferralsProgram = userSelectors.hasReferralsProgram(getState());

    if (isAuthenticated && hasReferralsProgram) {
      await dispatch(fetchUserReferralsThunk());
    }
  },
);

const fetchUserReferralsThunk = createAsyncThunk<UserReferral[], void, { state: RootState }>(
  'referrals/fetchUserReferrals',
  () => {
    return usersReferralsService.fetch();
  },
);

const refreshUserReferrals = createAsyncThunk<void, void, { state: RootState }>(
  'referrals/refreshUserReferrals',
  (payload, { dispatch }) => {
    dispatch(referralsThunks.fetchUserReferralsThunk());
    dispatch(planThunks.fetchUsageThunk());
  },
);

const executeUserReferralActionThunk = createAsyncThunk<void, { referralKey: ReferralKey }, { state: RootState }>(
  'referrals/executeUserReferralActionThunk',
  ({ referralKey }, { dispatch, getState }) => {
    const state = getState();
    const selectedWorkspace = state.workspaces.selectedWorkspace;

    switch (referralKey) {
      case ReferralKey.SubscribeToNewsletter: {
        break;
      }
      case ReferralKey.InstallDesktopApp: {
        desktopService.openDownloadAppUrl(translate);
        break;
      }
      case ReferralKey.InviteFriends: {
        navigationService.openPreferencesDialog({
          section: 'account',
          subsection: 'account',
          workspaceUuid: selectedWorkspace?.workspaceUser.workspaceId,
        });
        dispatch(uiActions.setIsPreferencesDialogOpen(true));
        break;
      }
      case ReferralKey.Invite2Friends: {
        navigationService.openPreferencesDialog({
          section: 'account',
          subsection: 'account',
          workspaceUuid: selectedWorkspace?.workspaceUser.workspaceId,
        });
        dispatch(uiActions.setIsPreferencesDialogOpen(true));
        break;
      }
    }
  },
);

export const referralsSlice = createSlice({
  name: 'referrals',
  initialState,
  reducers: {
    resetState: (state: ReferralsState) => {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserReferralsThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchUserReferralsThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload;
      })
      .addCase(fetchUserReferralsThunk.rejected, (state) => {
        state.isLoading = false;
      });
  },
});

export const referralsActions = referralsSlice.actions;

export const referralsThunks = {
  initializeThunk,
  fetchUserReferralsThunk,
  refreshUserReferrals,
  executeUserReferralActionThunk,
};

export default referralsSlice.reducer;
