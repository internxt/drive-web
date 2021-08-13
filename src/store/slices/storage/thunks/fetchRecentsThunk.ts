import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';
import { storageActions, StorageState } from '..';
import { RootState } from '../../..';
import { DriveItemData } from '../../../../models/interfaces';
import fileService from '../../../../services/file.service';

export const fetchRecentsThunk = createAsyncThunk<void, { limit: number }, { state: RootState }>(
  'storage/fetchRecents',
  async (payload: { limit: number }, { getState, dispatch }) => {
    const recents: DriveItemData[] = await fileService.fetchRecents(payload.limit) as DriveItemData[];

    dispatch(storageActions.clearSelectedItems());
    dispatch(storageActions.setRecents(recents));
  });

export const fetchRecentsThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(fetchRecentsThunk.pending, (state, action) => {
      state.isLoadingRecents = true;
    })
    .addCase(fetchRecentsThunk.fulfilled, (state, action) => {
      state.isLoadingRecents = false;
    })
    .addCase(fetchRecentsThunk.rejected, (state, action) => {
      state.isLoadingRecents = false;
    });
};