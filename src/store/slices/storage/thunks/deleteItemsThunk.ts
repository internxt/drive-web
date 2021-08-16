import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';
import { storageActions, StorageState } from '..';
import { RootState } from '../../..';
import { DriveItemData } from '../../../../models/interfaces';
import storageService from '../../../../services/storage.service';
import { selectorIsTeam } from '../../team';

export const deleteItemsThunk = createAsyncThunk<void, DriveItemData[], { state: RootState }>(
  'storage/deleteItems',
  async (itemsToDelete: DriveItemData[], { getState, dispatch }) => {
    const isTeam: boolean = selectorIsTeam(getState());

    await storageService.deleteItems(itemsToDelete, isTeam);
    dispatch(storageActions.popItems(itemsToDelete));
  }
);

export const deleteItemsThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(deleteItemsThunk.pending, (state, action) => {
      state.isDeletingItems = true;
    })
    .addCase(deleteItemsThunk.fulfilled, (state, action) => {
      state.isDeletingItems = false;
    })
    .addCase(deleteItemsThunk.rejected, (state, action) => {
      state.isDeletingItems = false;
    });
};