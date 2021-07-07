import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TeamsSettings } from '../../models/interfaces';

interface TeamSlice {
  team?: TeamsSettings
};

const initialState: TeamSlice = {
  team: undefined
};

export const teamSlice = createSlice({
  name: 'team',
  initialState,
  reducers: { },
});

export const { } = teamSlice.actions;

export default teamSlice.reducer