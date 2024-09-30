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
  // TODO: FOR WORKSPACES IT IS NOT WORKING PROPERLY
  // CHECK HOW IT WORKS IN WORKSPACES AND IN THE PERSONAL DRIVE TO COMPARE AND SEE THE DIFFERENCE
  const breadcrumbsList: FolderAncestor[] = await newStorageService.getFolderAncestors(uuid);
  const fullPathParsedNames = parsePathNames(breadcrumbsList);
  dispatch(storageActions.setNamePath(fullPathParsedNames));
};

export const goToFolderThunk = createAsyncThunk<void, FolderPath, { state: RootState }>(
  'storage/goToFolder',
  async (path: FolderPath, { getState, dispatch }) => {
    const state = getState();
    const currentPath = state.storage.currentPath;
    if (currentPath.uuid === path.uuid) {
      // no need to go to the same folder
      return;
    }

    dispatch(storageActions.setHasMoreDriveFolders({ folderId: path.uuid, status: true }));
    dispatch(storageActions.setHasMoreDriveFiles({ folderId: path.uuid, status: true }));
    dispatch(storageActions.clearCurrentThumbnailItems({ folderId: path.uuid }));
    const isInNamePath: boolean = storageSelectors.isFolderInNamePath(getState())(path.uuid);

    dispatch(storageActions.clearSelectedItems());

    dispatch(storageActions.resetDrivePagination());
    dispatch(storageActions.resetLevelsFoldersLength({ folderId: path.uuid }));

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
