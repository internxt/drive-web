import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { RootState } from '../../..';
import { storageActions } from '..';
import { StorageState } from '../storage.model';
import storageSelectors from '../storage.selectors';

export const resetNamePathThunk = createAsyncThunk<void, void, { state: RootState }>(
  'storage/resetNamePath',
  async (payload: void, { getState, dispatch }) => {
    const { user } = getState().user;
    const rootFolderId: number = storageSelectors.rootFolderId(getState());

    dispatch(storageActions.resetNamePath());

    if (user) {
      dispatch(storageActions.pushNamePath({
        id: rootFolderId,
        name: 'Drive'
      }));
    }
  });

export const resetNamePathThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(resetNamePathThunk.pending, (state, action) => { })
    .addCase(resetNamePathThunk.fulfilled, (state, action) => { })
    .addCase(resetNamePathThunk.rejected, (state, action) => { });
};