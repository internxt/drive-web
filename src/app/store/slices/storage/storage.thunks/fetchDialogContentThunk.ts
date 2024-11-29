import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';
import _ from 'lodash';

import newStorageService from 'app/drive/services/new-storage.service';
import { t } from 'i18next';
import { storageActions } from '..';
import { RootState } from '../../..';
import databaseService, { DatabaseCollection } from '../../../../database/services/database.service';
import { DriveFolderData, DriveItemData } from '../../../../drive/types';
import notificationsService, { ToastType } from '../../../../notifications/services/notifications.service';
import workspacesSelectors from '../../workspaces/workspaces.selectors';
import { StorageState } from '../storage.model';

export const fetchDialogContentThunk = createAsyncThunk<void, string, { state: RootState }>(
  'storage/fetchDialogContentThunk',
  async (folderId, { dispatch, getState }) => {
    const state = getState();
    const workspaceCredentials = workspacesSelectors.getWorkspaceCredentials(state);

    const [responsePromise] = newStorageService.getFolderContentByUuid({
      folderUuid: folderId,
      workspacesToken: workspaceCredentials?.tokenHeader,
    });
    const databaseContent = await databaseService.get<DatabaseCollection.MoveDialogLevels>(
      DatabaseCollection.MoveDialogLevels,
      folderId,
    );

    if (databaseContent) {
      dispatch(
        storageActions.setMoveDialogItems({
          folderId,
          items: databaseContent,
        }),
      );
    }

    await responsePromise.then(async (response) => {
      const folders = response.children.map((folder) => ({
        ...folder,
        isFolder: true,
        name: (folder as DriveFolderData).plainName,
      }));
      const items = _.concat(folders as DriveItemData[], response.files as DriveItemData[]);
      dispatch(
        storageActions.setMoveDialogItems({
          folderId,
          items,
        }),
      );
      await databaseService.delete(DatabaseCollection.MoveDialogLevels, folderId);
      await databaseService.put(DatabaseCollection.MoveDialogLevels, folderId, items);
    });
  },
);

export const fetchDialogContentThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(fetchDialogContentThunk.pending, () => undefined)
    .addCase(fetchDialogContentThunk.fulfilled, () => undefined)
    .addCase(fetchDialogContentThunk.rejected, (state, action) => {
      notificationsService.show({ text: t('error.fetchingFolderContent'), type: ToastType.Error });
    });
};
