import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../..';

import { teamActions } from '../team';
import { uiActions } from '../ui';
import { sessionActions } from '../session';
import { storageActions } from '../storage';
import navigationService from '../../../core/services/navigation.service';
import { sessionSelectors } from '../session/session.selectors';
import { AppView, LocalStorageItem } from '../../../core/types';
import tasksService from '../../../tasks/services/tasks.service';
import authService from '../../../auth/services/auth.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import userService from '../../../auth/services/user.service';
import { InitializeUserResponse, UpdateProfilePayload } from '@internxt/sdk/dist/drive/users/types';
import { storeTeamsInfo } from '../../../teams/services/teams.service';
import localStorageService from '../../../core/services/local-storage.service';
import { referralsActions } from '../referrals';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import { deleteDatabaseProfileAvatar } from '../../../drive/services/database.service';
import { saveAvatarToDatabase } from '../../../core/views/Preferences/tabs/Account/AvatarWrapper';
import dayjs from 'dayjs';

export interface UserState {
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
          root_folder_id: initializeUserBody.root_folder_id,
          bucket: initializeUserBody.bucket,
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
    dispatch(refreshUserThunk());
    dispatch(setIsUserInitialized(true));
  } else if (payload.redirectToLogin) {
    navigationService.push(AppView.Login);
  }
});

export const refreshUserThunk = createAsyncThunk<void, void, { state: RootState }>(
  'user/refresh',
  async (payload: void, { dispatch, getState }) => {
    const { user, token } = await userService.refreshUser();

    const currentUser = getState().user.user;
    if (!currentUser) throw new Error('Current user is not defined');

    const { avatar, emailVerified, name, lastname } = user;

    dispatch(userActions.setUser({ ...currentUser, avatar, emailVerified, name, lastname }));
    dispatch(userActions.setToken(token));
  },
);

export const logoutThunk = createAsyncThunk<void, void, { state: RootState }>(
  'user/logout',
  async (payload: void, { dispatch }) => {
    authService.logOut();

    dispatch(sessionActions.resetState());
    dispatch(userActions.resetState());
    dispatch(teamActions.resetState());
    dispatch(storageActions.resetState());
    dispatch(uiActions.resetState());
    dispatch(referralsActions.resetState());

    tasksService.clearTasks();
  },
);

export const updateUserProfileThunk = createAsyncThunk<void, Required<UpdateProfilePayload>, { state: RootState }>(
  'user/updateProfile',
  async (payload, { dispatch, getState }) => {
    const currentUser = getState().user.user;
    if (!currentUser) throw new Error('User is not defined');

    await userService.updateUserProfile(payload);
    dispatch(userActions.setUser({ ...currentUser, ...payload }));
  },
);

export const updateUserAvatarThunk = createAsyncThunk<void, { avatar: Blob }, { state: RootState }>(
  'user/updateAvatar',
  async (payload, { dispatch, getState }) => {
    const currentUser = getState().user.user;
    if (!currentUser) throw new Error('User is not defined');

    const { avatar } = await userService.updateUserAvatar(payload);

    await saveAvatarToDatabase(avatar, payload.avatar);
    dispatch(userActions.setUser({ ...currentUser, avatar }));
  },
);

export const deleteUserAvatarThunk = createAsyncThunk<void, void, { state: RootState }>(
  'user/deleteAvatar',
  async (payload, { dispatch, getState }) => {
    const currentUser = getState().user.user;
    if (!currentUser) throw new Error('User is not defined');

    await deleteDatabaseProfileAvatar();
    await userService.deleteUserAvatar();
    dispatch(userActions.setUser({ ...currentUser, avatar: null }));
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

      localStorageService.set(LocalStorageItem.User, JSON.stringify(action.payload));
    },
    setToken: (state: UserState, action: PayloadAction<string>) => {
      localStorageService.set(LocalStorageItem.UserToken, action.payload);
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
        notificationsService.show({ text: 'User initialization error ' + errorMsg, type: ToastType.Warning });
        navigationService.push(AppView.Login);
      });

    builder
      .addCase(refreshUserThunk.pending, () => undefined)
      .addCase(refreshUserThunk.fulfilled, () => undefined)
      .addCase(refreshUserThunk.rejected, () => undefined);

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
  hasSignedToday: (state: RootState): boolean => {
    const { user } = state.user;
    return dayjs(user?.createdAt).isSame(new Date(), 'day');
  },
  isFromAppSumo: (state: RootState): boolean => !!state.user.user?.appSumoDetails,
  hasReferralsProgram: (state: RootState): boolean => !!state.user.user?.hasReferralsProgram,
};

export const { initialize, resetState, setIsUserInitialized } = userSlice.actions;
export const userActions = userSlice.actions;

export const userThunks = {
  initializeUserThunk,
  refreshUserThunk,
  logoutThunk,
};

export default userSlice.reducer;
