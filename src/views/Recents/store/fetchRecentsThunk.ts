import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from 'app/store/slices/storage/storage.model';
import { storageActions } from 'app/store/slices/storage';
import { RootState } from 'app/store';
import { excludeHiddenItems, getItemPlainName } from 'app/crypto/services/utils';
import configService from 'app/core/services/config.service';
import { AppFileExplorerConfig } from 'app/core/types';
import { DriveItemData } from 'app/drive/types';
import { fetchRecents } from '../services';

export const fetchRecentsThunk = createAsyncThunk<void, void, { state: RootState }>(
  'storage/fetchRecents',
  async (payload: void, { dispatch }) => {
    const fileExplorerConfig: AppFileExplorerConfig = configService.getAppConfig().fileExplorer;
    const recents = (await fetchRecents(fileExplorerConfig.recentsLimit)) as DriveItemData[];
    const formattedRecents = recents.map((item) => ({
      ...item,
      name: getItemPlainName(item),
    }));

    const recentsWithoutHiddenFiles = excludeHiddenItems(formattedRecents);

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
