import { PhotoId } from '@internxt/sdk/dist/photos';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { photosSlice } from '..';

import { RootState } from '../../..';
import { SdkFactory } from '../../../../core/factory/sdk';
import { deleteDatabasePhotos } from '../../../../drive/services/database.service';

export const deleteThunk = createAsyncThunk<void, PhotoId[], { state: RootState }>(
  'photos/delete',
  async (payload: PhotoId[], { dispatch, getState }) => {
    const state = getState();

    dispatch(photosSlice.actions.removeItems(payload));
    dispatch(photosSlice.actions.setSkipped(state.photos.skipped - payload.length));

    const { photos } = await SdkFactory.getInstance().createPhotosClient();

    const promises = payload.map((id) => photos.deletePhotoById(id));

    await Promise.all(promises);
    await deleteDatabasePhotos(payload);
  },
);
