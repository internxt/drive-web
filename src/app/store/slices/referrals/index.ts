import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import desktopService from 'app/core/services/desktop.service';
import navigationService from 'app/core/services/navigation.service';
import usersReferralsService from 'app/referrals/services/users-referrals.service';

import { ReferralKey, UserReferral } from '@internxt/sdk/dist/drive/referrals/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
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

    const getDownloadApp = async () => {
      const download = await desktopService.getDownloadAppUrl();
      return download;
    };
    switch (referralKey) {
      case ReferralKey.SubscribeToNewsletter: {
        dispatch(uiActions.setIsNewsletterDialogOpen(true));
        break;
      }
      case ReferralKey.InstallDesktopApp: {
        getDownloadApp()
          .then((url) => {
            window.open(url, '_blank');
          })
          .catch(() => {
            notificationsService.show({
              text: 'Something went wrong while downloading the desktop app',
              type: ToastType.Error,
            });
          });
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
