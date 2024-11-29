import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { t } from 'i18next';
import { storageActions } from '..';
import { RootState } from '../../..';
import { SdkFactory } from '../../../../core/factory/sdk';
import errorService from '../../../../core/services/error.service';
import { DriveItemData } from '../../../../drive/types';
import notificationsService, { ToastType } from '../../../../notifications/services/notifications.service';
import workspacesSelectors from '../../workspaces/workspaces.selectors';
import { StorageState } from '../storage.model';

const DEFAULT_LIMIT = 50;

export const fetchSortedFolderContentThunk = createAsyncThunk<void, string, { state: RootState }>(
  'storage/fetchSortedFolderContentThunk',
  async (folderId, { getState, dispatch }) => {
    dispatch(storageActions.setHasMoreDriveFolders({ folderId, status: true }));
    dispatch(storageActions.setHasMoreDriveFiles({ folderId, status: true }));

    const storageState = getState().storage;
    const selectedWorkspace = workspacesSelectors.getSelectedWorkspace(getState());

    const hasMoreDriveFolders = storageState.hasMoreDriveFolders;
    const hasMoreDriveFiles = storageState.hasMoreDriveFiles;
    const foldersOffset = 0;
    const filesOffset = 0;
    const driveItemsSort = storageState.driveItemsSort;
    const driveItemsOrder = storageState.driveItemsOrder;
    const driveItemsSortForFolders = driveItemsSort === 'size' ? 'name' : driveItemsSort;
    const driveItemsOrderForFolders = driveItemsSort === 'size' ? 'ASC' : driveItemsOrder;

    try {
      dispatch(storageActions.setIsLoadingFolder({ folderId, value: true }));
      dispatch(storageActions.setItems({ folderId, items: [] }));
      const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
      const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();

      let folderPromise;

      if (hasMoreDriveFolders) {
        if (selectedWorkspace) {
          const workspaceId = selectedWorkspace.workspace.id;
          [folderPromise] = workspaceClient.getFolders(
            workspaceId ?? '',
            folderId,
            foldersOffset,
            DEFAULT_LIMIT,
            driveItemsSortForFolders,
            driveItemsOrderForFolders,
          );
        } else {
          [folderPromise] = await storageClient.getFolderFoldersByUuid(
            folderId,
            foldersOffset,
            DEFAULT_LIMIT,
            driveItemsSortForFolders,
            driveItemsOrderForFolders,
          );
        }
      }

      const itemsFolderUnparsed = await folderPromise;
      const itemsFolder = selectedWorkspace ? itemsFolderUnparsed.result : itemsFolderUnparsed.folders;
      const parsedItemsFolder = itemsFolder.map(
        (item) => ({ ...item, isFolder: true, name: item.plainName }) as DriveItemData,
      );
      const areLastFolders = itemsFolder.length < DEFAULT_LIMIT;
      dispatch(storageActions.setHasMoreDriveFolders({ folderId, status: !areLastFolders }));

      let filesPromise;

      if (hasMoreDriveFiles) {
        if (selectedWorkspace) {
          const workspaceId = selectedWorkspace.workspace.id;
          [filesPromise] = workspaceClient.getFiles(
            workspaceId ?? '',
            folderId,
            filesOffset,
            DEFAULT_LIMIT,
            driveItemsSort,
            driveItemsOrder,
          );
        } else {
          [filesPromise] = await storageClient.getFolderFilesByUuid(
            folderId,
            filesOffset,
            DEFAULT_LIMIT,
            driveItemsSort,
            driveItemsOrder,
          );
        }
      }
      const itemsFilesUnparsed = await filesPromise;
      const itemsFiles = selectedWorkspace ? itemsFilesUnparsed.result : itemsFilesUnparsed.files;
      const parsedItemsFiles = itemsFiles.map(
        (item) => ({ ...item, isFolder: false, name: item.plainName }) as DriveItemData,
      );
      const areLastFiles = itemsFiles.length < DEFAULT_LIMIT;
      dispatch(storageActions.setHasMoreDriveFiles({ folderId, status: !areLastFiles }));
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
