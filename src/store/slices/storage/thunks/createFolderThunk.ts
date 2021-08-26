import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { storageActions, storageSelectors, StorageState } from '..';
import { RootState } from '../../..';
import notify, { ToastType } from '../../../../components/Notifications';
import { StorageItemList } from '../../../../models/enums';
import { DriveFolderData, DriveItemData } from '../../../../models/interfaces';
import folderService, { CreatedFolder } from '../../../../services/folder.service';
import i18n from '../../../../services/i18n.service';
import { selectorIsTeam } from '../../team';

export const createFolderThunk = createAsyncThunk<void, string, { state: RootState }>(
  'storage/createFolder',
  async (folderName: string, { getState, dispatch }) => {
    const isTeam: boolean = selectorIsTeam(getState());
    const currentFolderId: number = storageSelectors.currentFolderId(getState());
    const createdFolder: CreatedFolder = await folderService.createFolder(isTeam, currentFolderId, folderName);
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
      lists: [StorageItemList.Drive],
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

      notify(errorMessage, ToastType.Error);
    });
};