import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { LocalStorageItem, Workspace } from '../../../core/types';
import localStorageService from '../../../core/services/local-storage.service';
import { SessionState } from './session.model';
import { sessionExtraReducers } from './session.thunks';

const initialState: SessionState = {
  hasConnection: true,
  workspace: Workspace.Individuals,
};

export const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    initialize: (state: SessionState) => {
      state.workspace = (localStorageService.getWorkspace() as Workspace) || Workspace.Individuals;
      localStorageService.set(LocalStorageItem.Workspace, state.workspace);
    },
    setHasConnection: (state: SessionState, action: PayloadAction<boolean>) => {
      state.hasConnection = action.payload;
    },
    setWorkspace: (state: SessionState, action: PayloadAction<Workspace>) => {
      state.workspace = action.payload;
    },
    resetState: (state: SessionState) => {
      Object.assign(state, initialState);
    },
  },
  extraReducers: sessionExtraReducers,
});

export const sessionActions = sessionSlice.actions;

export default sessionSlice.reducer;
