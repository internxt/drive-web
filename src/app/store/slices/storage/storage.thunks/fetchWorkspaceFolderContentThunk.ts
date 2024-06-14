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

const filterFolderItems = (item: DriveItemData) => item.isFolder;
const filterFilesItems = (item: DriveItemData) => !item.isFolder;

export const fetchWorkspaceFolderContentThunk = createAsyncThunk<void, string, { state: RootState }>(
  'storage/fetchWorkspaceFolderContentThunk',
  async (folderId, { getState, dispatch }) => {
    const storageState = getState().storage;
    const workspacesState = getState().workspaces;

    const hasMoreDriveFolders = storageState.hasMoreDriveFolders[folderId] ?? true;
    const hasMoreDriveFiles = storageState.hasMoreDriveFiles[folderId] ?? true;
    const foldersOffset = (storageState.levels[folderId] ?? []).filter(filterFolderItems).length;
    const filesOffset = (storageState.levels[folderId] ?? []).filter(filterFilesItems).length;
    const driveItemsSort = storageState.driveItemsSort;
    const driveItemsOrder = storageState.driveItemsOrder;
    const workspaceId = workspacesState.selectedWorkspace?.workspaceUser.workspaceId
      ? workspacesState.selectedWorkspace?.workspaceUser.workspaceId
      : '';

    if (foldersOffset === 0 && filesOffset === 0) dispatch(storageActions.resetOrder());

    try {
      const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();
      let itemsPromise;

      if (hasMoreDriveFolders) {
        [itemsPromise] = workspaceClient.getFolders(
          workspaceId,
          folderId,
          foldersOffset,
          DEFAULT_LIMIT,
          driveItemsSort,
          driveItemsOrder,
        );
      } else if (hasMoreDriveFiles) {
        [itemsPromise] = workspaceClient.getFiles(
          workspaceId,
          folderId,
          foldersOffset,
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
        dispatch(storageActions.setHasMoreDriveFolders({ folderId, status: !areLastItems }));
        dispatch(storageActions.addFolderFoldersLength({ folderId, foldersLength: itemslength }));
      } else {
        dispatch(storageActions.setHasMoreDriveFiles({ folderId, status: !areLastItems }));
        dispatch(storageActions.addFolderFilesLength({ folderId, filesLength: itemslength }));
      }
    } catch (error) {
      errorService.reportError(error, { extra: { folderId, foldersOffset, filesOffset } });
      throw error;
    } finally {
      dispatch(storageActions.setIsLoadingFolder({ folderId, value: false }));
    }
  },
);

export const fetchWorkspaceFolderContentThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(fetchWorkspaceFolderContentThunk.pending, (state, action) => {
      state.loadingFolders[action.meta.arg] = true;
    })
    .addCase(fetchWorkspaceFolderContentThunk.fulfilled, (state, action) => {
      state.loadingFolders[action.meta.arg] = false;
    })
    .addCase(fetchWorkspaceFolderContentThunk.rejected, (state, action) => {
      state.loadingFolders[action.meta.arg] = false;
      notificationsService.show({ text: t('error.fetchingFolderContent'), type: ToastType.Error });
    });
};
