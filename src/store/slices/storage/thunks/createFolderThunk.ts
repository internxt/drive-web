import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { storageSelectors, StorageState } from '..';
import { RootState } from '../../..';
import notify, { ToastType } from '../../../../components/Notifications';
import folderService from '../../../../services/folder.service';
import i18n from '../../../../services/i18n.service';
import { selectorIsTeam } from '../../team';

export const createFolderThunk = createAsyncThunk<void, string, { state: RootState }>(
  'storage/createFolder',
  async (folderName: string, { getState, dispatch }) => {
    const isTeam: boolean = selectorIsTeam(getState());
    const currentFolderId: number = storageSelectors.currentFolderId(getState());

    await folderService.createFolder(isTeam, currentFolderId, folderName);
  }
);

export const createFolderThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(createFolderThunk.pending, (state, action) => { })
    .addCase(createFolderThunk.fulfilled, (state, action) => { })
    .addCase(createFolderThunk.rejected, (state, action) => {
      const errorMessage = action.error.message?.includes('already exists') ?
        i18n.get('error.folderAlreadyExists') :
        i18n.get('error.creatingFolder');

      notify(errorMessage, ToastType.Error);
    });
};