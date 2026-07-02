import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { SessionState } from './session.model';
import { sessionExtraReducers } from './session.thunks';

const initialState: SessionState = {
  hasConnection: true,
};

export const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setHasConnection: (state: SessionState, action: PayloadAction<boolean>) => {
      state.hasConnection = action.payload;
    },
    resetState: (state: SessionState) => {
      Object.assign(state, initialState);
    },
  },
  extraReducers: sessionExtraReducers,
});

export const sessionActions = sessionSlice.actions;

export default sessionSlice.reducer;
