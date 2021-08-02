import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import { toast } from 'react-toastify';
import { RootState } from '../..';

import history from '../../../lib/history';
import { Workspace } from '../../../models/enums';
import { UserSettings } from '../../../models/interfaces';
import localStorageService from '../../../services/localStorage.service';
import { storeTeamsInfo } from '../../../services/teams.service';
import userService from '../../../services/user.service';
import { selectorIsTeam, setWorkspace } from '../team';

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

export const initializeUserThunk = createAsyncThunk(
  'user/initialize',
  async (payload: { redirectToLogin: boolean } = { redirectToLogin: true }, { dispatch, getState }: any) => {
    const { user, isAuthenticated } = getState().user;
    const isTeam = selectorIsTeam(getState());

    if (user && isAuthenticated) {
      if (!user.root_folder_id) {
        await userService.initializeUser();

        dispatch(setIsUserInitialized(true));
      } else {
        try {
          await storeTeamsInfo();
        } catch (e) {
          localStorageService.del('xTeam');
        }

        if (localStorageService.exists('xTeam') && isTeam && localStorageService.get('workspace') === 'business') {
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

    isTeam ? dispatch(setWorkspace(Workspace.Individual)) : dispatch(setWorkspace(Workspace.Business));

    localStorageService.set('workspace', isTeam ? Workspace.Business : Workspace.Individual);
  }
);

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
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
  }
});

export const {
  initialize,
  setIsUserInitialized,
  setUser
} = userSlice.actions;
export const userActions = userSlice.actions;
export const selectUser = (state: RootState): UserSettings | undefined => state.user.user;
export default userSlice.reducer;