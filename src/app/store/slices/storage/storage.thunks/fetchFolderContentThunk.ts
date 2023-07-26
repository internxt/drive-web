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
import errorService from '../../../../core/services/error.service';

const DEFAULT_LIMIT = 50;

const filterFolderItems = (item: DriveItemData) => item.isFolder;
const filterFilesItems = (item: DriveItemData) => !item.isFolder;

export const fetchPaginatedFolderContentThunk = createAsyncThunk<void, number, { state: RootState }>(
  'storage/fetchFolderContent',
  async (folderId, { getState, dispatch }) => {
    const storageState = getState().storage;
    const hasMoreDriveFolders = storageState.hasMoreDriveFolders;
    const hasMoreDriveFiles = storageState.hasMoreDriveFiles;
    const foldersOffset = (storageState.levels[folderId] ?? []).filter(filterFolderItems).length;
    const filesOffset = (storageState.levels[folderId] ?? []).filter(filterFilesItems).length;
    const driveItemsSort = storageState.driveItemsSort;
    const driveItemsOrder = storageState.driveItemsOrder;

    if (foldersOffset === 0 && filesOffset === 0) dispatch(storageActions.resetOrder());

    try {
      const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
      let itemsPromise;

      if (hasMoreDriveFolders) {
        [itemsPromise] = await storageClient.getFolderFolders(
          folderId,
          foldersOffset,
          DEFAULT_LIMIT,
          driveItemsSort,
          driveItemsOrder,
        );
      } else if (hasMoreDriveFiles) {
        [itemsPromise] = await storageClient.getFolderFiles(
          folderId,
          filesOffset,
          DEFAULT_LIMIT,
          driveItemsSort,
          driveItemsOrder,
        );
      } else {
        return;
      }
      const items = await itemsPromise;

      const parsedItems = items.result.map(
        (item) => ({ ...item, isFolder: hasMoreDriveFolders, name: item.plainName } as DriveItemData),
      );
      const itemslength = items.result.length;
      const areLastItems = itemslength < DEFAULT_LIMIT;

      dispatch(storageActions.addItems({ folderId, items: parsedItems }));

      if (hasMoreDriveFolders) {
        dispatch(storageActions.setHasMoreDriveFolders(!areLastItems));
        dispatch(storageActions.addFolderFoldersLength({ folderId, foldersLength: itemslength }));
      } else {
        dispatch(storageActions.setHasMoreDriveFiles(!areLastItems));
        dispatch(storageActions.addFolderFilesLength({ folderId, filesLength: itemslength }));
      }
    } catch (error) {
      errorService.reportError(error, { extra: { folderId, foldersOffset, filesOffset } });
      throw error;
    }
  },
);

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
    .addCase(fetchPaginatedFolderContentThunk.pending, (state, action) => {
      state.loadingFolders[action.meta.arg] = true;
    })
    .addCase(fetchPaginatedFolderContentThunk.fulfilled, (state, action) => {
      state.loadingFolders[action.meta.arg] = false;
    })
    .addCase(fetchPaginatedFolderContentThunk.rejected, (state, action) => {
      state.loadingFolders[action.meta.arg] = false;
      notificationsService.show({ text: t('error.fetchingFolderContent'), type: ToastType.Error });
    });
};
