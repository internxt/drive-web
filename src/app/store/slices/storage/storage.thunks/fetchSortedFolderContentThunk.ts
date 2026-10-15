import { createAsyncThunk } from '@reduxjs/toolkit';

import { storageActions } from '..';
import { RootState } from '../../..';
import { SdkFactory } from '../../../../core/factory/sdk';
import errorService from 'services/error.service';
import { DriveItemData } from 'app/drive/types';
import workspacesSelectors from '../../workspaces/workspaces.selectors';
import { applyCachedFolderSizes } from './applyCachedFolderSizes';
import { DEFAULT_LIMIT, getCursorPageQuery, hasMorePages } from './getCursorPageQuery';
import { toDriveThumbnail } from 'utils/driveThumbnail.utils';

export const fetchSortedFolderContentThunk = createAsyncThunk<void, string, { state: RootState }>(
  'storage/fetchSortedFolderContentThunk',
  async (folderId, { getState, dispatch }) => {
    dispatch(storageActions.setHasMoreDriveFolders({ folderId, status: true }));
    dispatch(storageActions.setHasMoreDriveFiles({ folderId, status: true }));

    const storageState = getState().storage;
    const selectedWorkspace = workspacesSelectors.getSelectedWorkspace(getState());
    const isCursorPagination = !selectedWorkspace;

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
          [folderPromise] = storageClient.getFolderFoldersByUuidWithCursor(
            folderId,
            getCursorPageQuery(driveItemsOrder),
          );
        }
      }

      const itemsFolderUnparsed = await folderPromise;
      const itemsFolder = selectedWorkspace ? itemsFolderUnparsed.result : itemsFolderUnparsed.folders;
      const parsedItemsFolder = itemsFolder.map(
        (item) => ({ ...item, isFolder: true, name: item.plainName }) as DriveItemData,
      );
      const hasMoreFolders = hasMorePages({
        isCursorPagination,
        nextCursor: itemsFolderUnparsed.nextCursor,
        itemsLength: itemsFolder.length,
      });
      dispatch(storageActions.setHasMoreDriveFolders({ folderId, status: hasMoreFolders }));

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
          [filesPromise] = storageClient.getFolderFilesByUuidWithCursor(folderId, {
            ...getCursorPageQuery(driveItemsOrder),
            withThumbnails: true,
          });
        }
      }
      const itemsFilesUnparsed = await filesPromise;
      const itemsFiles = selectedWorkspace ? itemsFilesUnparsed.result : itemsFilesUnparsed.files;
      const parsedItemsFiles = itemsFiles.map(
        (item) =>
          ({
            ...item,
            isFolder: false,
            name: item.plainName,
            thumbnails: item.thumbnails?.map(toDriveThumbnail),
          }) as DriveItemData,
      );
      const hasMoreFiles = hasMorePages({
        isCursorPagination,
        nextCursor: itemsFilesUnparsed.nextCursor,
        itemsLength: itemsFiles.length,
      });
      dispatch(storageActions.setHasMoreDriveFiles({ folderId, status: hasMoreFiles }));
      const items = parsedItemsFolder.concat(parsedItemsFiles);
      const itemsWithCachedSizes = await applyCachedFolderSizes(folderId, items);

      dispatch(storageActions.setItems({ folderId, items: itemsWithCachedSizes }));

      const isSameOrder = getState().storage.driveItemsOrder === driveItemsOrder;
      const shouldStoreCursor = isCursorPagination && isSameOrder;
      if (shouldStoreCursor) {
        dispatch(storageActions.setDriveFoldersCursor({ folderId, cursor: itemsFolderUnparsed.nextCursor }));
        dispatch(storageActions.setDriveFilesCursor({ folderId, cursor: itemsFilesUnparsed.nextCursor }));
      }
    } catch (error) {
      errorService.reportError(error);
      throw error;
    } finally {
      dispatch(storageActions.setIsLoadingFolder({ folderId, value: false }));
    }
  },
);
