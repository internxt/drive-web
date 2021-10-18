import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { storageActions } from '..';
import { RootState } from '../../..';
import { excludeHiddenItems } from '../../../../crypto/services/utils';
import configService from '../../../../core/services/config.service';
import fileService from '../../../../drive/services/file.service';
import { DriveItemData } from '../../../../drive/types';
import { AppFileExplorerConfig } from '../../../../core/types';

export const fetchRecentsThunk = createAsyncThunk<void, void, { state: RootState }>(
  'storage/fetchRecents',
  async (payload: void, { dispatch }) => {
    const fileExplorerConfig: AppFileExplorerConfig = configService.getAppConfig().fileExplorer;
    const recents: DriveItemData[] = (await fileService.fetchRecents(
      fileExplorerConfig.recentsLimit,
    )) as DriveItemData[];

    const recentsWithoutHiddenFiles = excludeHiddenItems(recents);

    dispatch(storageActions.clearSelectedItems());
    dispatch(storageActions.setRecents(recentsWithoutHiddenFiles));
  },
);

export const fetchRecentsThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(fetchRecentsThunk.pending, (state) => {
      state.isLoadingRecents = true;
    })
    .addCase(fetchRecentsThunk.fulfilled, (state) => {
      state.isLoadingRecents = false;
    })
    .addCase(fetchRecentsThunk.rejected, (state) => {
      state.isLoadingRecents = false;
    });
};
