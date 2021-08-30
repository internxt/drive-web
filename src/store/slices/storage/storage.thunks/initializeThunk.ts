import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { RootState } from '../../..';
import { resetNamePathThunk } from './resetNamePathThunk';

export const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'storage/initialize',
  async (payload: void, { dispatch }) => {
    dispatch(resetNamePathThunk());
  },
);

export const initializeThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(initializeThunk.pending, () => undefined)
    .addCase(initializeThunk.fulfilled, () => undefined)
    .addCase(initializeThunk.rejected, () => undefined);
};
