import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../..';
import { Workspace } from '../../../models/enums';
import { TeamsSettings } from '../../../models/interfaces';
import localStorageService from '../../../services/localStorage.service';

interface TeamState {
  team?: TeamsSettings
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
    },
    setWorkspace: (state: TeamState, action: PayloadAction<Workspace>) => {
      state.workspace = action.payload;
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