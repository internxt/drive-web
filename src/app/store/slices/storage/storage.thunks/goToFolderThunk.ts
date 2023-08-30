import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { RootState } from '../../..';
import { FolderPath } from '../../../../drive/types';
import { uiActions } from '../../ui';
import storageSelectors from '../storage.selectors';
import { storageActions } from '..';

export const goToFolderThunk = createAsyncThunk<void, FolderPath, { state: RootState }>(
  'storage/goToFolder',
  async (path: FolderPath, { getState, dispatch }) => {
    const state = getState();
    const currentPath = state.storage.currentPath as FolderPath;
    if (currentPath.id === path.id) {
      // no need to go to the same folder
      return;
    }
    dispatch(storageActions.clearCurrentThumbnailItems({ folderId: path.id }));
    const isInNamePath: boolean = storageSelectors.isFolderInNamePath(getState())(path.id);
    console.log('isInNamePath', isInNamePath);
    dispatch(storageActions.clearSelectedItems());

    dispatch(storageActions.resetDrivePagination());
    dispatch(storageActions.resetLevelsFoldersLength({ folderId: path.id }));

    isInNamePath ? dispatch(storageActions.popNamePathUpTo(path)) : dispatch(storageActions.pushNamePath(path));

    dispatch(uiActions.setFileInfoItem(null));
    dispatch(uiActions.setIsDriveItemInfoMenuOpen(false));
    dispatch(storageActions.setCurrentPath(path));
  },
);

export const goToFolderThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(goToFolderThunk.pending, () => undefined)
    .addCase(goToFolderThunk.fulfilled, () => undefined)
    .addCase(goToFolderThunk.rejected, () => undefined);
};
