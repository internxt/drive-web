import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { storageActions } from '..';
import { RootState } from '../../..';
import { excludeHiddenItems, getItemPlainName } from '../../../../crypto/services/utils';
import configService from '../../../../core/services/config.service';
import fileService from '../../../../drive/services/file.service';
import { AppFileExplorerConfig } from '../../../../core/types';
import { DriveItemData } from 'app/drive/types';

export const fetchRecentsThunk = createAsyncThunk<void, void, { state: RootState }>(
  'storage/fetchRecents',
  async (payload: void, { dispatch }) => {
    const fileExplorerConfig: AppFileExplorerConfig = configService.getAppConfig().fileExplorer;
    const recents = (await fileService.fetchRecents(fileExplorerConfig.recentsLimit)) as DriveItemData[];
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
