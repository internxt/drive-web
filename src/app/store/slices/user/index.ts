import { UpdateProfilePayload } from '@internxt/sdk/dist/drive/users/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import dayjs from 'dayjs';
import { RootState } from '../..';
import { authService, userService, localStorageService, navigationService } from 'services';
import { AppView, LocalStorageItem } from '../../../core/types';
import { deleteDatabaseProfileAvatar } from '../../../drive/services/database.service';
import { saveAvatarToDatabase } from '../../../../views/NewSettings/components/Sections/Account/Account/components/AvatarWrapper';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import tasksService from '../../../tasks/services/tasks.service';
import { referralsActions } from '../referrals';
import { sessionActions } from '../session';
import { sessionSelectors } from '../session/session.selectors';
import { storageActions } from '../storage';
import { uiActions } from '../ui';
import { workspacesActions } from '../../../store/slices/workspaces/workspacesStore';

import errorService from 'services/error.service';
import { isTokenExpired } from '../../utils';
import { refreshAvatar } from 'utils/avatarUtils';
import { ProductService } from 'views/Checkout/services';
import { UserTierFeatures } from 'views/Checkout/services/products.service';
import { t } from 'i18next';

export interface UserState {
  isInitializing: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
  user?: UserSettings;
  userTierFeatures?: UserTierFeatures;
}

const initialState: UserState = {
  isInitializing: false,
  isAuthenticated: false,
  isInitialized: false,
  user: undefined,
  userTierFeatures: undefined,
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
    dispatch(refreshUserThunk());
    dispatch(getUserTierFeaturesThunk());
    dispatch(refreshAvatarThunk());
    dispatch(setIsUserInitialized(true));
  } else if (payload.redirectToLogin) {
    navigationService.push(AppView.Login);
  }
});

export const refreshUserThunk = createAsyncThunk<void, { forceRefresh?: boolean } | undefined, { state: RootState }>(
  'user/refresh',
  async ({ forceRefresh } = {}, { dispatch, getState }) => {
    const userToken = localStorageService.get(LocalStorageItem.UserToken);
    const isExpired = isTokenExpired(userToken);

    const currentUser = getState().user.user;
    if (!currentUser) throw new Error('Current user is not defined');

    try {
      if (isExpired || forceRefresh) {
        const { user, newToken } = await userService.refreshUserData(currentUser.uuid);

        const { emailVerified, name, lastname, uuid } = user;
        const avatar = await refreshAvatar(uuid);

        dispatch(userActions.setUser({ ...currentUser, avatar, emailVerified, name, lastname }));
        dispatch(userActions.setToken(newToken));
      }
    } catch (err) {
      errorService.reportError(err, { extra: { thunk: 'refreshUser' } });
    }
  },
);

export const getUserTierFeaturesThunk = createAsyncThunk<void, void, { state: RootState }>(
  'user/getUserTierFeatures',
  async (_, { dispatch }) => {
    try {
      const userFeatures = await ProductService.instance.getAvailableUserFeatures();

      dispatch(userActions.setUserTierFeatures(userFeatures));
    } catch (error) {
      console.error('Error getting the user tier features', error);
      notificationsService.show({
        text: t('error.featuresUnavailable'),
        type: ToastType.Warning,
      });
    }
  },
);

export const refreshAvatarThunk = createAsyncThunk<void, { forceRefresh?: boolean } | undefined, { state: RootState }>(
  'user/avatarRefresh',
  async (_, { dispatch, getState }) => {
    const currentUser = getState().user.user;
    if (!currentUser) throw new Error('Current user is not defined');

    try {
      if (currentUser) {
        const { uuid } = currentUser;
        const refreshedAvatar = await refreshAvatar(uuid);

        dispatch(
          userActions.setUser({
            ...currentUser,
            avatar: refreshedAvatar,
          }),
        );
      }
    } catch (err) {
      errorService.reportError(err, { extra: { thunk: 'refreshAvatarUser' } });
    }
  },
);

export const logoutThunk = createAsyncThunk<void, void, { state: RootState }>(
  'user/logout',
  async (payload: void, { dispatch }) => {
    await authService.logOut();

    dispatch(sessionActions.resetState());
    dispatch(userActions.resetState());
    dispatch(storageActions.resetState());
    dispatch(uiActions.resetState());
    dispatch(referralsActions.resetState());
    dispatch(workspacesActions.resetState());

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

const updateUserEmailCredentialsThunk = createAsyncThunk<
  void,
  { newUserData: UserSettings; token: string; newToken: string },
  { state: RootState }
>('user/updateUser', async (payload, { dispatch, getState }) => {
  const currentUser = getState().user.user as UserSettings;
  const { newUserData, token, newToken } = payload;

  const user = {
    ...currentUser,
    email: newUserData.email,
    bridgeUser: newUserData.email,
    username: newUserData.email,
  };
  localStorageService.set('xToken', token);
  localStorageService.set('xNewToken', newToken);
  dispatch(userActions.setUser(user));
});

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
    setUserTierFeatures(state: UserState, action: PayloadAction<UserTierFeatures>) {
      state.userTierFeatures = action.payload;
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
  updateUserEmailCredentialsThunk,
};

export default userSlice.reducer;
