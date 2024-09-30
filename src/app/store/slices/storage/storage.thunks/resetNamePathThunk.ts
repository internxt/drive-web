import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { RootState } from '../../..';
import { storageActions } from '..';
import { StorageState } from '../storage.model';
import storageSelectors from '../storage.selectors';
import { FolderPath } from 'app/drive/types';

export const resetNamePathThunk = createAsyncThunk<FolderPath[], void, { state: RootState }>(
  'storage/resetNamePath',
  async (payload: void, { getState, dispatch }) => {
    const { user } = getState().user;
    const rootFolderId: string = storageSelectors.rootFolderId(getState());
    const rootFolderPath = {
      uuid: rootFolderId,
      name: 'Drive',
    };
    dispatch(storageActions.resetNamePath());

    if (user) {
      dispatch(storageActions.pushNamePath(rootFolderPath));
      return [rootFolderPath];
    }
    return [];
  },
);

export const resetNamePathThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(resetNamePathThunk.pending, () => undefined)
    .addCase(resetNamePathThunk.fulfilled, (state, { payload }) => {
      if (payload.length > 0) {
        state.currentPath = payload[0];
      }
    })
    .addCase(resetNamePathThunk.rejected, () => undefined);
};
