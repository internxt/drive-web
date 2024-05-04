import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { t } from 'i18next';
import { storageActions } from '..';
import { RootState } from '../../..';
import { SdkFactory } from '../../../../core/factory/sdk';
import errorService from '../../../../core/services/error.service';
import { DriveItemData } from '../../../../drive/types';
import notificationsService, { ToastType } from '../../../../notifications/services/notifications.service';
import { StorageState } from '../storage.model';

const DEFAULT_LIMIT = 50;

export const fetchSortedFolderContentThunk = createAsyncThunk<void, number, { state: RootState }>(
  'storage/fetchSortedFolderContentThunk',
  async (folderId, { getState, dispatch }) => {
    dispatch(storageActions.setHasMoreDriveFolders({ folderId, status: true }));
    dispatch(storageActions.setHasMoreDriveFiles({ folderId, status: true }));

    const storageState = getState().storage;
    const hasMoreDriveFolders = storageState.hasMoreDriveFolders;
    const hasMoreDriveFiles = storageState.hasMoreDriveFiles;
    const foldersOffset = 0;
    const filesOffset = 0;
    const driveItemsSort = storageState.driveItemsSort;
    const driveItemsOrder = storageState.driveItemsOrder;

    try {
      dispatch(storageActions.setIsLoadingFolder({ folderId, value: true }));
      dispatch(storageActions.setItems({ folderId, items: [] }));
      const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
      let folderPromise;

      if (hasMoreDriveFolders) {
        [folderPromise] = await storageClient.getFolderFolders(
          folderId,
          foldersOffset,
          DEFAULT_LIMIT,
          driveItemsSort,
          driveItemsOrder,
        );
      }

      const itemsFolder = await folderPromise;

      const parsedItemsFolder = itemsFolder.result.map(
        (item) => ({ ...item, isFolder: true, name: item.plainName } as DriveItemData),
      );

      let filesPromise;

      if (hasMoreDriveFiles) {
        [filesPromise] = await storageClient.getFolderFiles(
          folderId,
          filesOffset,
          DEFAULT_LIMIT,
          driveItemsSort,
          driveItemsOrder,
        );
      }
      const itemsFiles = await filesPromise;

      const parsedItemsFiles = itemsFiles.result.map(
        (item) => ({ ...item, isFolder: false, name: item.plainName } as DriveItemData),
      );

      const items = parsedItemsFolder.concat(parsedItemsFiles);

      dispatch(storageActions.setItems({ folderId, items: items }));
    } catch (error) {
      errorService.reportError(error, { extra: { folderId, foldersOffset, filesOffset } });
      throw error;
    } finally {
      dispatch(storageActions.setIsLoadingFolder({ folderId, value: false }));
    }
  },
);

export const fetchSortedFolderContentThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(fetchSortedFolderContentThunk.pending, (state, action) => {
      state.loadingFolders[action.meta.arg] = true;
    })
    .addCase(fetchSortedFolderContentThunk.fulfilled, (state, action) => {
      state.loadingFolders[action.meta.arg] = false;
    })
    .addCase(fetchSortedFolderContentThunk.rejected, (state, action) => {
      state.loadingFolders[action.meta.arg] = false;
      notificationsService.show({ text: t('error.fetchingFolderContent'), type: ToastType.Error });
    });
};
