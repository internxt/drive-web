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

const filterFolderItems = (item: DriveItemData) => item.isFolder;
const filterFilesItems = (item: DriveItemData) => !item.isFolder;

export const fetchPaginatedFolderContentThunk = createAsyncThunk<void, string, { state: RootState }>(
  'storage/fetchFolderContent',
  async (folderId, { getState, dispatch, rejectWithValue }) => {
    const storageState = getState().storage;
    const selectedWorkspace = workspacesSelectors.getSelectedWorkspace(getState());

    const hasMoreDriveFolders = storageState.hasMoreDriveFolders[folderId] ?? true;
    const hasMoreDriveFiles = storageState.hasMoreDriveFiles[folderId] ?? true;

    const foldersOffset = (storageState.levels[folderId] ?? []).filter(filterFolderItems).length;
    const filesOffset = (storageState.levels[folderId] ?? []).filter(filterFilesItems).length;
    const driveItemsSort = storageState.driveItemsSort;
    const driveItemsOrder = storageState.driveItemsOrder;
    const driveItemsSortForFolders = driveItemsSort === 'size' ? 'name' : driveItemsSort;

    try {
      if (folderId) {
        let itemsPromise;

        const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
        const workspaceClient = SdkFactory.getNewApiInstance().createWorkspacesClient();

        if (hasMoreDriveFolders) {
          if (selectedWorkspace) {
            const workspaceId = selectedWorkspace.workspace.id;
            [itemsPromise] = workspaceClient.getFolders(
              workspaceId ?? '',
              folderId,
              foldersOffset,
              DEFAULT_LIMIT,
              driveItemsSortForFolders,
              driveItemsOrder,
            );
          } else {
            [itemsPromise] = storageClient.getFolderFoldersByUuid(
              folderId,
              foldersOffset,
              DEFAULT_LIMIT,
              driveItemsSortForFolders,
              driveItemsOrder,
            );
          }
        } else if (hasMoreDriveFiles) {
          if (selectedWorkspace) {
            const workspaceId = selectedWorkspace.workspace.id;
            [itemsPromise] = workspaceClient.getFiles(
              workspaceId ?? '',
              folderId,
              filesOffset,
              DEFAULT_LIMIT,
              driveItemsSort,
              driveItemsOrder,
            );
          } else {
            [itemsPromise] = storageClient.getFolderFilesByUuid(
              folderId,
              filesOffset,
              DEFAULT_LIMIT,
              driveItemsSort,
              driveItemsOrder,
            );
          }
        } else {
          return;
        }
        const itemsUnparsed = await itemsPromise;
        let parsedItems;
        let itemslength;

        if (hasMoreDriveFolders) {
          const items = selectedWorkspace ? itemsUnparsed.result : itemsUnparsed.folders;

          parsedItems = items.map(
            (item) => ({ ...item, isFolder: hasMoreDriveFolders, name: item.plainName }) as DriveItemData,
          );
          itemslength = items.length;
        } else if (!hasMoreDriveFolders) {
          const items = selectedWorkspace ? itemsUnparsed.result : itemsUnparsed.files;

          parsedItems = items.map(
            (item) => ({ ...item, isFolder: hasMoreDriveFolders, name: item.plainName }) as DriveItemData,
          );
          itemslength = items.length;
        }

        const areLastItems = itemslength < DEFAULT_LIMIT;

        dispatch(storageActions.addItems({ folderId, items: parsedItems }));

        if (hasMoreDriveFolders) {
          dispatch(storageActions.setHasMoreDriveFolders({ folderId, status: !areLastItems }));
          dispatch(storageActions.addFolderFoldersLength({ folderId, foldersLength: itemslength }));
        } else {
          dispatch(storageActions.setHasMoreDriveFiles({ folderId, status: !areLastItems }));
          dispatch(storageActions.addFolderFilesLength({ folderId, filesLength: itemslength }));
        }
      }
    } catch (error) {
      errorService.reportError(error, { extra: { folderId, foldersOffset, filesOffset } });
      const castedError = errorService.castError(error);
      throw rejectWithValue(castedError);
    }
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
      const isUnauthorizedError = (payload: unknown): payload is { status: number } =>
        typeof payload === 'object' && payload !== null && 'status' in payload && payload.status === 401;

      if (!isUnauthorizedError(action.payload)) {
        notificationsService.show({ text: t('error.fetchingFolderContent'), type: ToastType.Error });
      }
    });
};
