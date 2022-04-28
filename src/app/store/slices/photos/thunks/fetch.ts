import { PhotoStatus, PhotoWithDownloadLink } from '@internxt/sdk/dist/photos';
import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';
import { photosSlice, PhotosState, SerializablePhoto } from '..';

import { RootState } from '../../..';
import { SdkFactory } from '../../../../core/factory/sdk';

const PAGE_SIZE = 60;

export const fetchThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/fetch',
  async (payload: void, { dispatch, getState }) => {
    const state = getState();
    if (state.photos.isLoading || !state.photos.thereIsMore) return;

    dispatch(photosSlice.actions.setIsLoading(true));

    const { skipped } = state.photos;

    const { photos } = await SdkFactory.getInstance().createPhotosClient();

    const data = await photos.getPhotos({ status: PhotoStatus.Exists }, skipped, PAGE_SIZE, true);

    dispatch(photosSlice.actions.setBucketId(data.bucketId));

    const serializablePhotos = makePhotosSerializable(data.results);
    dispatch(photosSlice.actions.push(serializablePhotos));

    const thereIsMore = data.results.length === PAGE_SIZE;

    if (!thereIsMore) {
      dispatch(photosSlice.actions.setThereIsMore(false));
    }

    dispatch(photosSlice.actions.setSkipped(skipped + data.results.length));
  },
);

export const fetchThunkExtraReducers = (builder: ActionReducerMapBuilder<PhotosState>): void => {
  builder
    .addCase(fetchThunk.fulfilled, (state) => {
      state.isLoading = false;
    })
    .addCase(fetchThunk.rejected, (state) => {
      state.isLoading = false;
    });
};

function makePhotosSerializable(photos: PhotoWithDownloadLink[]): SerializablePhoto[] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return photos.map(({ takenAt, statusChangedAt, createdAt, updatedAt, ...rest }) => rest);
}
