import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { storageActions, storageSelectors } from '..';
import { RootState } from '../../..';
import { StorageItemList } from '../../../../models/enums';
import { DriveFolderData, DriveItemData } from '../../../../models/interfaces';
import folderService, { CreateFolderResponse } from '../../../../services/folder.service';
import i18n from '../../../../services/i18n.service';
import notificationsService, { ToastType } from '../../../../services/notifications.service';

export const createFolderThunk = createAsyncThunk<void, string, { state: RootState }>(
  'storage/createFolder',
  async (folderName: string, { getState, dispatch }) => {
    const currentFolderId: number = storageSelectors.currentFolderId(getState());
    const createdFolder: CreateFolderResponse = await folderService.createFolder(currentFolderId, folderName);
    const createdFolderNormalized: DriveFolderData = {
      ...createdFolder,
      name: folderName,
      parent_id: createdFolder.parentId,
      user_id: createdFolder.userId,
      icon: null,
      iconId: null,
      icon_id: null,
      isFolder: true,
      color: null,
      encrypt_version: null
    };

    dispatch(storageActions.pushItems({
      list: StorageItemList.Drive,
      items: createdFolderNormalized as DriveItemData
    }));
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

      notificationsService.show(errorMessage, ToastType.Error);
    });
};