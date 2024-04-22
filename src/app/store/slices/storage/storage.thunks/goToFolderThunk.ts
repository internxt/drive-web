import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { FolderAncestor } from '@internxt/sdk/dist/drive/storage/types';
import { storageActions } from '..';
import { RootState } from '../../..';
import newStorageService from '../../../../drive/services/new-storage.service';
import { FolderPath } from '../../../../drive/types';
import { uiActions } from '../../ui';
import { StorageState } from '../storage.model';
import storageSelectors from '../storage.selectors';

const parsePathNames = (breadcrumbsList: FolderAncestor[]) => {
  // ADDED UNTIL WE UPDATE TYPESCRIPT VERSION
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore:next-line
  const fullPath = breadcrumbsList.toReversed();
  const fullPathParsedNamesList = fullPath.map((pathItem) => ({ ...pathItem, name: pathItem.plainName }));

  return fullPathParsedNamesList;
};

export const getAncestorsAndSetNamePath = async (uuid: string, dispatch) => {
  const breadcrumbsList: FolderAncestor[] = await newStorageService.getFolderAncestors(uuid);
  const fullPathParsedNames = parsePathNames(breadcrumbsList);
  dispatch(storageActions.setNamePath(fullPathParsedNames));
};

export const resetLoaderNavigationStatus = createAsyncThunk<void, { folderId: number }, { state: RootState }>(
  'storage/goToFolder',
  async ({ folderId }, { dispatch }) => {
    dispatch(storageActions.setIsLoadingFolder({ folderId: folderId, value: true }));
    dispatch(storageActions.setHasMoreDriveFolders({ folderId: folderId, status: true }));
    dispatch(storageActions.setHasMoreDriveFiles({ folderId: folderId, status: true }));
    dispatch(storageActions.resetLevelsFoldersLength({ folderId: folderId }));
    dispatch(storageActions.resetDrivePagination());
  },
);

export const goToFolderThunk = createAsyncThunk<void, FolderPath, { state: RootState }>(
  'storage/goToFolder',
  async (path: FolderPath, { getState, dispatch }) => {
    const state = getState();
    const currentPath = state.storage.currentPath;
    if (currentPath.id === path.id) {
      // no need to go to the same folder
      return;
    }

    dispatch(storageActions.setHasMoreDriveFolders({ folderId: path.id, status: true }));
    dispatch(storageActions.setHasMoreDriveFiles({ folderId: path.id, status: true }));
    dispatch(storageActions.clearCurrentThumbnailItems({ folderId: path.id }));
    const isInNamePath: boolean = storageSelectors.isFolderInNamePath(getState())(path.id);

    dispatch(storageActions.clearSelectedItems());

    dispatch(storageActions.resetDrivePagination());
    dispatch(storageActions.resetLevelsFoldersLength({ folderId: path.id }));

    isInNamePath ? dispatch(storageActions.popNamePathUpTo(path)) : dispatch(storageActions.pushNamePath(path));

    dispatch(uiActions.setFileInfoItem(null));
    dispatch(uiActions.setIsDriveItemInfoMenuOpen(false));
    dispatch(storageActions.setCurrentPath(path));

    if (path.uuid && !isInNamePath) {
      getAncestorsAndSetNamePath(path.uuid, dispatch);
    }
  },
);

export const goToFolderThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(goToFolderThunk.pending, () => undefined)
    .addCase(goToFolderThunk.fulfilled, () => undefined)
    .addCase(goToFolderThunk.rejected, () => undefined);
};
