import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { Workspace } from '../../../models/enums';
import localStorageService from '../../../services/local-storage.service';
import { SessionState } from './session.model';
import { sessionExtraReducers } from './session.thunks';

const initialState: SessionState = {
  hasConnection: true,
  workspace: Workspace.Personal
};

export const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    initialize: (state: SessionState) => {
      state.workspace = localStorageService.getWorkspace() as Workspace;
    },
    setHasConnection: (state: SessionState, action: PayloadAction<boolean>) => {
      state.hasConnection = action.payload;
    },
    setWorkspace: (state: SessionState, action: PayloadAction<Workspace>) => {
      state.workspace = action.payload;
    },
    resetState: (state: SessionState) => {
      Object.assign(state, initialState);
    }
  },
  extraReducers: sessionExtraReducers
});

export const sessionActions = sessionSlice.actions;

export default sessionSlice.reducer;