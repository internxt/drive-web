import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { UserSettings } from '../../models/interfaces';
import localStorageService from '../../services/localStorage.service';

interface UserState {
  isAuthenticated: boolean;
  isInitialized: boolean;
  user?: UserSettings | any
}

const initialState: UserState = {
  isAuthenticated: false,
  isInitialized: false,
  user: undefined
};

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
  }
});

export const {
  initialize,
  setIsUserInitialized,
  setUser
} = userSlice.actions;
export const userActions = userSlice.actions;

export default userSlice.reducer;