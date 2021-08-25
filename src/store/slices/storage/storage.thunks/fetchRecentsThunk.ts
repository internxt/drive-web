import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { storageActions } from '..';
import { RootState } from '../../..';
import { excludeHiddenItems } from '../../../../lib/utils';
import { AppFileExplorerConfig, DriveItemData } from '../../../../models/interfaces';
import configService from '../../../../services/config.service';
import fileService from '../../../../services/file.service';

export const fetchRecentsThunk = createAsyncThunk<void, void, { state: RootState }>(
  'storage/fetchRecents',
  async (payload: void, { getState, dispatch }) => {
    const fileExplorerConfig: AppFileExplorerConfig = configService.getAppConfig().fileExplorer;
    const recents: DriveItemData[] = await fileService.fetchRecents(fileExplorerConfig.recentsLimit) as DriveItemData[];

    const recentsWithoutHiddenFiles = excludeHiddenItems(recents);

    dispatch(storageActions.clearSelectedItems());
    dispatch(storageActions.setRecents(recentsWithoutHiddenFiles));
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