import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../..';
import { Workspace } from '../../../models/enums';
import { TeamsSettings } from '../../../models/interfaces';
import localStorageService from '../../../services/local-storage.service';

interface TeamState {
  team?: TeamsSettings | null,
  workspace: Workspace
}

const initialState: TeamState = {
  team: undefined,
  workspace: Workspace.Personal
};

export const teamSlice = createSlice({
  name: 'team',
  initialState,
  reducers: {
    initialize: (state: TeamState) => {
      state.team = localStorageService.getTeams();
      state.workspace = localStorageService.getWorkspace() as Workspace;
    },
    setWorkspace: (state: TeamState, action: PayloadAction<Workspace>) => {
      state.workspace = action.payload;
    },
    resetState: (state: TeamState) => {
      Object.assign(state, initialState);
    }
  }
});

export const {
  initialize,
  setWorkspace
} = teamSlice.actions;
export const teamActions = teamSlice.actions;
export const selectorIsTeam = (state: RootState): boolean => state.team.workspace !== Workspace.Personal;

export default teamSlice.reducer;