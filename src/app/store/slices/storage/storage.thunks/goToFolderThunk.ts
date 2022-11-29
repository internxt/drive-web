import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { RootState } from '../../..';
import { FolderPath } from '../../../../drive/types';
import { uiActions } from '../../ui';
import storageSelectors from '../storage.selectors';
import { fetchPaginatedFolderContentThunk } from './fetchFolderContentThunk';
import { storageActions } from '..';

export const goToFolderThunk = createAsyncThunk<void, FolderPath, { state: RootState }>(
  'storage/goToFolder',
  async (path: FolderPath, { getState, dispatch }) => {
    dispatch(storageActions.clearCurrentThumbnailItems({ folderId: path.id }));
    const isInNamePath: boolean = storageSelectors.isFolderInNamePath(getState())(path.id);

    dispatch(storageActions.clearSelectedItems());
    console.log('GO TO FOLDER THUNK');
    dispatch(fetchPaginatedFolderContentThunk({ folderId: path.id, index: 0, limit: 20 })).unwrap();

    isInNamePath ? dispatch(storageActions.popNamePathUpTo(path)) : dispatch(storageActions.pushNamePath(path));

    dispatch(uiActions.setFileInfoItem(null));
    dispatch(uiActions.setIsDriveItemInfoMenuOpen(false));
  },
);

export const goToFolderThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(goToFolderThunk.pending, () => undefined)
    .addCase(goToFolderThunk.fulfilled, () => undefined)
    .addCase(goToFolderThunk.rejected, () => undefined);
};
