import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import { RootState } from '../..';

import history from '../../../lib/history';
import { IUserPlan, UserSettings } from '../../../models/interfaces';
import { Workspace } from '../../../models/enums';
import localStorageService from '../../../services/local-storage.service';
import { storeTeamsInfo } from '../../../services/teams.service';
import userService from '../../../services/user.service';
import { selectorIsTeam, setWorkspace, teamActions } from '../team';
import authService from '../../../services/auth.service';
import { tasksActions } from '../tasks';
import { uiActions } from '../ui';
import { planThunks } from '../plan';

interface UserState {
  isInitializing: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
  user?: UserSettings,
  currentPlan: null | IUserPlan,
  isLoadingStripe: boolean
}

const initialState: UserState = {
  isInitializing: false,
  isAuthenticated: false,
  isInitialized: false,
  user: undefined,
  currentPlan: null,
  isLoadingStripe: true
};

export const initializeUserThunk = createAsyncThunk(
  'user/initialize',
  async (payload: { redirectToLogin: boolean } = { redirectToLogin: true }, { dispatch, getState }: any) => {
    const { user, isAuthenticated } = getState().user;

    if (user && isAuthenticated) {
      if (!user.root_folder_id) {
        const initializeUserBody = await userService.initializeUser(user.email, user.mnemonic);

        dispatch(userActions.setUser({
          ...user,
          root_folder_id: initializeUserBody.user.root_folder_id,
          bucket: initializeUserBody.user.bucket
        }));

        dispatch(setIsUserInitialized(true));
      } else {
        try {
          await storeTeamsInfo();
          dispatch(teamActions.initialize());
        } catch (e) {
          localStorageService.removeItem('xTeam');
        }

        dispatch(setIsUserInitialized(true));
      }
    } else if (payload.redirectToLogin) {
      history.push('/login');
    }
  }
);

export const changeWorkspaceThunk = createAsyncThunk<void, void, { state: RootState }>(
  'user/changeWorkspace',
  async (payload: void, { dispatch, getState }) => {
    const isTeam: boolean = selectorIsTeam(getState());
    const newWorkspace = isTeam ? Workspace.Personal : Workspace.Business;

    dispatch(setWorkspace(newWorkspace));
    localStorageService.set('workspace', newWorkspace);

    dispatch(planThunks.initializeThunk());
  }
);

export const logoutThunk = createAsyncThunk<void, void, { state: RootState }>(
  'user/logout',
  async (payload: void, { dispatch, getState }) => {
    authService.logOut();

    dispatch(teamActions.resetState());
    dispatch(userActions.resetState());
    dispatch(uiActions.resetState());
    dispatch(tasksActions.resetState());
  }
);

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    resetState: (state: UserState) => {
      Object.assign(state, initialState);
    },
    initialize: (state: UserState) => {
      state.user = localStorageService.getUser() || undefined;
      state.isAuthenticated = !!state.user;
    },
    setIsUserInitialized: (state: UserState, action: PayloadAction<boolean>) => {
      state.isInitialized = action.payload;
    },
    setUser: (state: UserState, action: PayloadAction<UserSettings>) => {
      state.isAuthenticated = !!action.payload;
      state.user = action.payload;

      localStorageService.set('xUser', JSON.stringify(action.payload));
    },
    setUserPlan: (state: UserState, action: PayloadAction<IUserPlan>) => {
      state.currentPlan = action.payload;
    },
    setIsLoadingStripePlan: (state: UserState, action: PayloadAction<boolean>) => {
      state.isLoadingStripe = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeUserThunk.pending, (state, action) => {
        state.isInitializing = true;
      })
      .addCase(initializeUserThunk.fulfilled, (state, action) => {
        state.isInitializing = false;
      })
      .addCase(initializeUserThunk.rejected, (state, action) => {
        const errorMsg = action.payload ? action.payload : '';

        state.isInitializing = false;

        toast.warn('User initialization error ' + errorMsg);
        history.push('/login');
      });

    builder
      .addCase(logoutThunk.pending, (state, action) => { })
      .addCase(logoutThunk.fulfilled, (state, action) => { })
      .addCase(logoutThunk.rejected, (state, action) => { });
  }
});

export const {
  initialize,
  resetState,
  setIsUserInitialized,
  setUser,
  setUserPlan
} = userSlice.actions;
export const userActions = userSlice.actions;

export const selectUserPlan = (state: RootState): IUserPlan | null => state.user.currentPlan;
export const setIsLoadingStripePlan = (state: RootState): boolean => state.user.isLoadingStripe;
export const userThunks = {
  initializeUserThunk,
  logoutThunk,
  changeWorkspaceThunk
};

export const userSelectors = {
  selectUserPlan,
  setIsLoadingStripePlan
};

export default userSlice.reducer;