import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';
import fileService from 'app/drive/services/file.service';
import { DriveItemData } from 'app/drive/types';
import { storageActions } from '..';

import { RootState } from '../../..';
import { StorageState } from '../storage.model';

export const fetchDeletedThunk = createAsyncThunk<void, void, { state: RootState }>(
  'storage/trash',
  async (_payload: void, { dispatch }) => {
    const deleted: DriveItemData[] = (await fileService.fetchDeleted()) as DriveItemData[];

    dispatch(storageActions.clearSelectedItems());
    dispatch(storageActions.setItemsOnTrash(deleted));
  },
);

export const fetchDeletedThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(fetchDeletedThunk.pending, (state) => {
      state.isLoadingRecents = true;
    })
    .addCase(fetchDeletedThunk.fulfilled, (state) => {
      state.isLoadingRecents = false;
    })
    .addCase(fetchDeletedThunk.rejected, (state) => {
      state.isLoadingRecents = false;
    });
};
