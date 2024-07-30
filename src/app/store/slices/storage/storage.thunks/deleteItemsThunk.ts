import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { storageActions } from '..';
import { RootState } from '../../..';
import { DriveItemData } from '../../../../drive/types';
import { planThunks } from '../../plan';

export const deleteItemsThunk = createAsyncThunk<void, DriveItemData[], { state: RootState }>(
  'storage/deleteItems',
  async (itemsToDelete: DriveItemData[], { dispatch, getState }) => {
    const { selectedWorkspace } = getState().workspaces;
    const memberId = selectedWorkspace?.workspaceUser?.memberId;

    dispatch(planThunks.fetchUsageThunk());
    if (memberId) dispatch(planThunks.fetchBusinessLimitUsageThunk());
    dispatch(storageActions.popItems({ updateRecents: true, items: itemsToDelete }));
    dispatch(storageActions.clearSelectedItems());
  },
);

export const deleteItemsThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(deleteItemsThunk.pending, (state) => {
      state.isDeletingItems = true;
    })
    .addCase(deleteItemsThunk.fulfilled, (state) => {
      state.isDeletingItems = false;
    })
    .addCase(deleteItemsThunk.rejected, (state) => {
      state.isDeletingItems = false;
    });
};
