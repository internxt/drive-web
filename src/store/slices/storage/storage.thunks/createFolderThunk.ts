import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { storageActions, storageSelectors } from '..';
import { RootState } from '../../..';
import { StorageItemList } from '../../../../models/enums';
import { DriveFolderData, DriveItemData } from '../../../../models/interfaces';
import folderService from '../../../../services/folder.service';
import i18n from '../../../../services/i18n.service';
import notificationsService, { ToastType } from '../../../../services/notifications.service';
import { CancelTokenSource } from 'axios';

interface CreateFolderPayload {
  parentId: number;
  folderName: string;
}

export const createFolderThunk = createAsyncThunk<
  [DriveFolderData, CancelTokenSource],
  CreateFolderPayload,
  { state: RootState }
>('storage/createFolder', async ({ folderName, parentId }: CreateFolderPayload, { getState, dispatch }) => {
  const [createdFolderPromise, cancelTokenSource] = folderService.createFolder(parentId, folderName);
  const createdFolder = await createdFolderPromise;
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
    encrypt_version: null,
  };

  if (storageSelectors.currentFolderId(getState()) === parentId)
    dispatch(
      storageActions.pushItems({
        lists: [StorageItemList.Drive],
        items: createdFolderNormalized as DriveItemData,
      }),
    );

  return [createdFolderNormalized, cancelTokenSource];
});

export const createFolderThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(createFolderThunk.pending, () => undefined)
    .addCase(createFolderThunk.fulfilled, () => undefined)
    .addCase(createFolderThunk.rejected, (state, action) => {
      const errorMessage = action.error.message?.includes('already exists')
        ? i18n.get('error.folderAlreadyExists')
        : i18n.get('error.creatingFolder');

      notificationsService.show(errorMessage, ToastType.Error);
    });
};
