import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';
import _ from 'lodash';

import { storageActions, StorageState } from '..';
import { RootState } from '../../..';
import notify, { ToastType } from '../../../../components/Notifications';
import { DriveItemData } from '../../../../models/interfaces';
import folderService from '../../../../services/folder.service';
import i18n from '../../../../services/i18n.service';
import storageSelectors from '../storageSelectors';

export const fetchFolderContentThunk = createAsyncThunk<void, number, { state: RootState }>(
  'storage/fetchFolderContent',
  async (folderId: number = -1, { getState, dispatch }) => {
    const currentFolderId: number = storageSelectors.currentFolderId(getState());

    folderId = ~folderId ? folderId : currentFolderId;

    const content = await folderService.fetchFolderContent(folderId);

    dispatch(storageActions.clearSelectedItems());

    dispatch(
      storageActions.setItems(_.concat(
        content.folders as DriveItemData[],
        content.files as DriveItemData[]
      ))
    );
  }
);

export const fetchFolderContentThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(fetchFolderContentThunk.pending, (state, action) => {
      state.isLoading = true;
    })
    .addCase(fetchFolderContentThunk.fulfilled, (state, action) => {
      state.isLoading = false;
    })
    .addCase(fetchFolderContentThunk.rejected, (state, action) => {
      state.isLoading = false;
      notify(
        i18n.get('error.fetchingFolderContent'),
        ToastType.Error
      );
    });
};