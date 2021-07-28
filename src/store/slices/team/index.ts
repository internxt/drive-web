import { createSlice } from '@reduxjs/toolkit';
import { TeamsSettings } from '../../../models/interfaces';
import localStorageService from '../../../services/localStorage.service';

interface TeamState {
  team?: TeamsSettings
}

const initialState: TeamState = {
  team: undefined
};

export const teamSlice = createSlice({
  name: 'team',
  initialState,
  reducers: {
    initialize: (state: TeamState) => {
      state.team = localStorageService.getTeams();
    }
  }
});

export const {
  initialize
} = teamSlice.actions;
export const teamActions = teamSlice.actions;

export default teamSlice.reducer;