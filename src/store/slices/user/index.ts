import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import { RootState } from '../..';

import history from '../../../lib/history';
import { IUserPlan, UserSettings } from '../../../models/interfaces';
import { Workspace } from '../../../models/enums';
import localStorageService from '../../../services/localStorage.service';
import { storeTeamsInfo } from '../../../services/teams.service';
import userService from '../../../services/user.service';
import { selectorIsTeam, setWorkspace, teamActions } from '../team';
import authService from '../../../services/auth.service';

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
    const isTeam = selectorIsTeam(getState());

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
          localStorageService.del('xTeam');
        }

        if (localStorageService.exists('xTeam') && isTeam && localStorageService.get('workspace') === Workspace.Business) {
          dispatch(handleChangeWorkspaceThunk());
        }

        dispatch(setIsUserInitialized(true));
      }
    } else if (payload.redirectToLogin) {
      history.push('/login');
    }
  }
);

export const handleChangeWorkspaceThunk = createAsyncThunk(
  'user/changeWorkspace',
  async (payload: void, { dispatch, getState }: any) => {
    const isTeam: boolean = selectorIsTeam(getState());

    isTeam ? dispatch(setWorkspace(Workspace.Personal)) : dispatch(setWorkspace(Workspace.Business));

    localStorageService.set('workspace', isTeam ? Workspace.Business : Workspace.Personal);
  }
);

export const logoutThunk = createAsyncThunk(
  'user/logout',
  async (payload: void, { dispatch, getState }: any) => {
    authService.logOut();

    dispatch(teamActions.setWorkspace(Workspace.Personal));
    dispatch(userActions.resetState());
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
      state.user = localStorageService.getUser();
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
  handleChangeWorkspaceThunk
};

export const userSelectors = {
  selectUserPlan,
  setIsLoadingStripePlan
};

export default userSlice.reducer;