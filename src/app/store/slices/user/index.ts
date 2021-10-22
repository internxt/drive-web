import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import { RootState } from '../..';

import { teamActions } from '../team';
import { uiActions } from '../ui';
import { sessionActions } from '../session';
import { storageActions } from '../storage';
import navigationService from '../../../core/services/navigation.service';
import { sessionSelectors } from '../session/session.selectors';
import { AppView } from '../../../core/types';
import tasksService from '../../../tasks/services/tasks.service';
import authService from '../../../auth/services/auth.service';
import { UserSettings } from '../../../auth/types';
import userService, { InitializeUserResponse } from '../../../auth/services/user.service';
import { storeTeamsInfo } from '../../../teams/services/teams.service';
import localStorageService from '../../../core/services/local-storage.service';

interface UserState {
  isInitializing: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
  user?: UserSettings;
}

const initialState: UserState = {
  isInitializing: false,
  isAuthenticated: false,
  isInitialized: false,
  user: undefined,
};

export const initializeUserThunk = createAsyncThunk<
  void,
  { redirectToLogin: boolean } | undefined,
  { state: RootState }
>('user/initialize', async (payload: { redirectToLogin?: boolean } = {}, { dispatch, getState }) => {
  const defaultPayload = {
    redirectToLogin: true,
  };
  const { user, isAuthenticated } = getState().user;

  payload = { ...defaultPayload, ...payload };

  if (user && isAuthenticated) {
    if (!user.root_folder_id) {
      const initializeUserBody = (await userService.initializeUser(
        user.email,
        user.mnemonic,
      )) as InitializeUserResponse;

      dispatch(
        userActions.setUser({
          ...user,
          root_folder_id: initializeUserBody.user.root_folder_id,
          bucket: initializeUserBody.user.bucket,
        }),
      );
    }

    if (user.teams) {
      try {
        await storeTeamsInfo();
        dispatch(teamActions.initialize());
      } catch (err: unknown) {
        localStorageService.removeItem('xTeam');
      }
    }

    dispatch(setIsUserInitialized(true));
  } else if (payload.redirectToLogin) {
    navigationService.push(AppView.Login);
  }
});

export const logoutThunk = createAsyncThunk<void, void, { state: RootState }>(
  'user/logout',
  async (payload: void, { dispatch }) => {
    authService.logOut();

    dispatch(sessionActions.resetState());
    dispatch(userActions.resetState());
    dispatch(teamActions.resetState());
    dispatch(storageActions.resetState());
    dispatch(uiActions.resetState());

    tasksService.clearTasks();
  },
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
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeUserThunk.pending, (state) => {
        state.isInitializing = true;
      })
      .addCase(initializeUserThunk.fulfilled, (state) => {
        state.isInitializing = false;
      })
      .addCase(initializeUserThunk.rejected, (state, action) => {
        const errorMsg = action.payload ? action.payload : '';

        state.isInitializing = false;

        toast.warn('User initialization error ' + errorMsg);
        navigationService.push(AppView.Login);
      });

    builder
      .addCase(logoutThunk.pending, () => undefined)
      .addCase(logoutThunk.fulfilled, () => undefined)
      .addCase(logoutThunk.rejected, () => undefined);
  },
});

export const userSelectors = {
  userFullName: (state: RootState): string => {
    const { user } = state.user;

    return user ? `${user?.name} ${user?.lastname}` : '';
  },
  nameLetters: (state: RootState): string => {
    const { user } = state.user;
    const isTeam = sessionSelectors.isTeam(state);
    const nameLetters: string = isTeam
      ? 'B'
      : (user as UserSettings).name[0] + ((user as UserSettings).lastname[0] || '');

    return nameLetters.toUpperCase();
  },
  isFromAppSumo: (state: RootState): boolean => !!state.user.user?.appSumoDetails,
};

export const { initialize, resetState, setIsUserInitialized } = userSlice.actions;
export const userActions = userSlice.actions;

export const userThunks = {
  initializeUserThunk,
  logoutThunk,
};

export default userSlice.reducer;
