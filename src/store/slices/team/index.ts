import { createSlice } from '@reduxjs/toolkit';

import { TeamsSettings } from '../../../models/interfaces';
import localStorageService from '../../../services/local-storage.service';

interface TeamState {
  team?: TeamsSettings | null;
}

const initialState: TeamState = {
  team: undefined,
};

export const teamSlice = createSlice({
  name: 'team',
  initialState,
  reducers: {
    initialize: (state: TeamState) => {
      state.team = localStorageService.getTeams();
    },
    resetState: (state: TeamState) => {
      Object.assign(state, initialState);
    },
  },
});

export const { initialize } = teamSlice.actions;
export const teamActions = teamSlice.actions;

export default teamSlice.reducer;
