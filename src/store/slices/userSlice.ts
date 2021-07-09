import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserSettings } from '../../models/interfaces';

interface UserState {
  user?: UserSettings
};

const initialState: UserState = {
  user: undefined
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: { },
});

export const { } = userSlice.actions;

export default userSlice.reducer