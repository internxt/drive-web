import { createAsyncThunk } from '@reduxjs/toolkit';
import { photosSlice } from '..';

import { RootState } from '../../..';
import { SdkFactory } from '../../../../core/factory/sdk';

export const deleteThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/delete',
  async (payload: void, { dispatch, getState }) => {
    const state = getState();

    dispatch(photosSlice.actions.removeItems(state.photos.selectedItems));
    dispatch(photosSlice.actions.setSkipped(state.photos.skipped - state.photos.selectedItems.length));
    dispatch(photosSlice.actions.unselectAll());

    const { photos } = SdkFactory.getInstance().createPhotosClient();

    const promises = state.photos.selectedItems.map((id) => photos.deletePhotoById(id));

    await Promise.all(promises);
  },
);
