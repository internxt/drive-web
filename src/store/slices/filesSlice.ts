import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface FilesState { };

const initialState: FilesState = { };

export const filesSlice = createSlice({
  name: 'files',
  initialState,
  reducers: { },
});

export const { } = filesSlice.actions;

export default filesSlice.reducer