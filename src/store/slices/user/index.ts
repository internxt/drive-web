import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import { RootState } from '../..';

import history from '../../../lib/history';
import { UserSettings } from '../../../models/interfaces';
import localStorageService from '../../../services/local-storage.service';
import { storeTeamsInfo } from '../../../services/teams.service';
import userService from '../../../services/user.service';
import { teamActions } from '../team';
import authService from '../../../services/auth.service';
import { tasksActions } from '../tasks';
import { uiActions } from '../ui';
import { sessionActions } from '../session';
import { storageActions } from '../storage';

interface UserState {
  isInitializing: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
  user?: UserSettings
}

const initialState: UserState = {
  isInitializing: false,
  isAuthenticated: false,
  isInitialized: false,
  user: undefined
};

export const initializeUserThunk = createAsyncThunk<void, {redirectToLogin: boolean } | undefined, { state: RootState }>(
  'user/initialize',
  async (payload: { redirectToLogin?: boolean } = {}, { dispatch, getState }) => {
    const defaultPayload = {
      redirectToLogin: true
    };
    const { user, isAuthenticated } = getState().user;

    payload = { ...defaultPayload, ...payload };

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

export const logoutThunk = createAsyncThunk<void, void, { state: RootState }>(
  'user/logout',
  async (payload: void, { dispatch, getState }) => {
    authService.logOut();

    dispatch(sessionActions.resetState());
    dispatch(userActions.resetState());
    dispatch(teamActions.resetState());
    dispatch(storageActions.resetState());
    dispatch(uiActions.resetState());
    dispatch(tasksActions.resetState());
  }
);

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
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
    resetState: (state: UserState) => {
      Object.assign(state, initialState);
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
  setUser
} = userSlice.actions;
export const userActions = userSlice.actions;

export const userThunks = {
  initializeUserThunk,
  logoutThunk
};

export default userSlice.reducer;