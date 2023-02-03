import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';
import _ from 'lodash';

import { storageActions } from '..';
import { RootState } from '../../..';
import { StorageState } from '../storage.model';
import notificationsService, { ToastType } from '../../../../notifications/services/notifications.service';
import databaseService, { DatabaseCollection } from '../../../../database/services/database.service';
import { DriveItemData } from '../../../../drive/types';
import { SdkFactory } from '../../../../core/factory/sdk';
import { t } from 'i18next';

export const fetchFolderContentThunk = createAsyncThunk<void, number, { state: RootState }>(
  'storage/fetchFolderContent',
  async (folderId, { dispatch }) => {
    const storageClient = SdkFactory.getInstance().createStorageClient();
    const [responsePromise] = storageClient.getFolderContent(folderId);
    const databaseContent = await databaseService.get<DatabaseCollection.Levels>(DatabaseCollection.Levels, folderId);

    dispatch(storageActions.resetOrder());

    if (databaseContent) {
      dispatch(
        storageActions.setItems({
          folderId,
          items: databaseContent,
        }),
      );
    } else {
      await responsePromise;
    }

    responsePromise.then((response) => {
      const folders = response.children.map((folder) => ({ ...folder, isFolder: true }));
      const items = _.concat(folders as DriveItemData[], response.files as DriveItemData[]);
      dispatch(
        storageActions.setItems({
          folderId,
          items,
        }),
      );
      databaseService.put(DatabaseCollection.Levels, folderId, items);
    });
  },
);

export const fetchFolderContentThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(fetchFolderContentThunk.pending, (state, action) => {
      state.loadingFolders[action.meta.arg] = true;
    })
    .addCase(fetchFolderContentThunk.fulfilled, (state, action) => {
      state.loadingFolders[action.meta.arg] = false;
    })
    .addCase(fetchFolderContentThunk.rejected, (state, action) => {
      state.loadingFolders[action.meta.arg] = false;
      notificationsService.show({ text: t('error.fetchingFolderContent'), type: ToastType.Error });
    });
};
