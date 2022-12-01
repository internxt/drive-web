import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';
import _ from 'lodash';

import { storageActions } from '..';
import { RootState } from '../../..';
import { StorageState } from '../storage.model';
import i18n from '../../../../i18n/services/i18n.service';
import notificationsService, { ToastType } from '../../../../notifications/services/notifications.service';
import databaseService, { DatabaseCollection } from '../../../../database/services/database.service';
import { DriveItemData } from '../../../../drive/types';
import { SdkFactory } from '../../../../core/factory/sdk';

interface FolderContentThunkType {
  folderId: number;
  index?: number;
  limit?: number;
}

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

export const fetchPaginatedFolderContentThunk = createAsyncThunk<void, FolderContentThunkType, { state: RootState }>(
  'storage/fetchPaginatedFolderContent',
  async ({ folderId, index = 0, limit = 50 }, thunkAPI) => {
    const { dispatch, getState } = thunkAPI;
    const storageClient = SdkFactory.getInstance().createStorageClient();
    const [responsePromise] = storageClient.getFolderContentByName(folderId, false, index, limit);
    const databaseContent = await databaseService.get<DatabaseCollection.Levels>(DatabaseCollection.Levels, folderId);

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
      const state = getState();
      const hasMoreItems = !response.finished;

      const folders = response.children.map((folder) => ({ ...folder, isFolder: true }));
      const items = _.concat(folders as DriveItemData[], response.files as DriveItemData[]);
      const existingItems = state.storage.levels?.[folderId] ?? [];
      const newItemsList = index > 0 ? existingItems.concat(items) : items;

      dispatch(storageActions.setHasMoreItems(hasMoreItems));
      dispatch(
        storageActions.setItems({
          folderId,
          items: newItemsList,
        }),
      );

      databaseService.put(DatabaseCollection.Levels, folderId, newItemsList);
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
      notificationsService.show({ text: i18n.get('error.fetchingFolderContent'), type: ToastType.Error });
    })
    .addCase(fetchPaginatedFolderContentThunk.pending, (state, action) => {
      state.loadingFolders[action.meta.arg.folderId] = true;
    })
    .addCase(fetchPaginatedFolderContentThunk.fulfilled, (state, action) => {
      state.loadingFolders[action.meta.arg.folderId] = false;
    })
    .addCase(fetchPaginatedFolderContentThunk.rejected, (state, action) => {
      state.loadingFolders[action.meta.arg.folderId] = false;
      notificationsService.show({ text: i18n.get('error.fetchingFolderContent'), type: ToastType.Error });
    });
};
