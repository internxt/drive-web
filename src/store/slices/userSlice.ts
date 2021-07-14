import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { UserSettings } from '../../models/interfaces';
import localStorageService from '../../services/localStorage.service';

interface UserState {
  user?: UserSettings | any
}

const initialState: UserState = {
  user: undefined
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser: (state: UserState, action: PayloadAction<UserSettings>) => {
      state.user = action.payload;
      localStorageService.set('xUser', JSON.stringify(action.payload));
    }
  }
});

export const { setUser } = userSlice.actions;
export default userSlice.reducer;