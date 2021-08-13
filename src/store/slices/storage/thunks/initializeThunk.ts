import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '..';
import { RootState } from '../../..';
import { resetNamePathThunk } from './resetNamePathThunk';

export const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'storage/initialize',
  async (payload: void, { getState, dispatch }) => {
    dispatch(resetNamePathThunk());
  });

export const initializeThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(initializeThunk.pending, (state, action) => { })
    .addCase(initializeThunk.fulfilled, (state, action) => { })
    .addCase(initializeThunk.rejected, (state, action) => { });
};