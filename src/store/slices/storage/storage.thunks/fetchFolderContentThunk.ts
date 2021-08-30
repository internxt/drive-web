import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';
import _ from 'lodash';

import { storageActions } from '..';
import { RootState } from '../../..';
import { DriveItemData } from '../../../../models/interfaces';
import folderService from '../../../../services/folder.service';
import { StorageState } from '../storage.model';
import storageSelectors from '../storage.selectors';
import i18n from '../../../../services/i18n.service';
import notificationsService, { ToastType } from '../../../../services/notifications.service';

export const fetchFolderContentThunk = createAsyncThunk<void, number | undefined, { state: RootState }>(
  'storage/fetchFolderContent',
  async (folderId = -1, { getState, dispatch }) => {
    const currentFolderId: number = storageSelectors.currentFolderId(getState());
    const content = await folderService.fetchFolderContent(~folderId ? folderId : currentFolderId);

    dispatch(storageActions.clearSelectedItems());

    dispatch(storageActions.setItems(_.concat(content.folders as DriveItemData[], content.files as DriveItemData[])));
  },
);

export const fetchFolderContentThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(fetchFolderContentThunk.pending, (state) => {
      state.isLoading = true;
    })
    .addCase(fetchFolderContentThunk.fulfilled, (state) => {
      state.isLoading = false;
    })
    .addCase(fetchFolderContentThunk.rejected, (state) => {
      state.isLoading = false;
      notificationsService.show(i18n.get('error.fetchingFolderContent'), ToastType.Error);
    });
};
