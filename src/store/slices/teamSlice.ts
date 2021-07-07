import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface TeamSlice {};

const initialState: TeamSlice = {};

export const teamSlice = createSlice({
  name: 'team',
  initialState,
  reducers: { },
});

export const { } = teamSlice.actions;

export default teamSlice.reducer