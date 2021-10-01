import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { RootState } from '../../..';
import { FolderPath } from '../../../../models/interfaces';
import { uiActions } from '../../ui';
import storageSelectors from '../storage.selectors';
import { fetchFolderContentThunk } from './fetchFolderContentThunk';
import { storageActions } from '..';

export const goToFolderThunk = createAsyncThunk<void, FolderPath, { state: RootState }>(
  'storage/goToFolder',
  async (path: FolderPath, { getState, dispatch }) => {
    const isInNamePath: boolean = storageSelectors.isFolderInNamePath(getState())(path.id);

    dispatch(storageActions.clearSelectedItems());

    dispatch(fetchFolderContentThunk(path.id)).unwrap();

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
