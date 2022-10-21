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

export const fetchTrashedPhotosThunk = createAsyncThunk<void, void, { state: RootState }>(
  'photos/fetchTrashPhotos',
  async (payload: void, { dispatch, getState }) => {
    const state = getState();
    if (state.photos.isLoadingTrashPhotos || !state.photos.thereIsMoreTrashPhotos) return;

    dispatch(photosSlice.actions.setIsLoadingTrashPhotos(true));

    const { skippedTrashPhotos } = state.photos;

    const { photos } = await SdkFactory.getInstance().createPhotosClient();

    // TODO: CHANGE PhotoStatus.Deleted to PhotoStatus.Trashed before merge, for the moment
    // is Deleted because it seems that not exists Trashed photos
    const data = await photos.getPhotos({ status: PhotoStatus.Deleted }, skippedTrashPhotos, PAGE_SIZE, true);

    dispatch(photosSlice.actions.setBucketId(data.bucketId));

    const serializablePhotos = makePhotosSerializable(data.results);
    dispatch(photosSlice.actions.pushTrashPhotos(serializablePhotos));

    const thereIsMore = data.results.length === PAGE_SIZE;

    if (!thereIsMore) {
      dispatch(photosSlice.actions.setThereIsMoreTrashPhotos(false));
    }

    dispatch(photosSlice.actions.setSkippedTrashPhotos(skippedTrashPhotos + data.results.length));
  },
);

export const fetchThunkExtraReducers = (builder: ActionReducerMapBuilder<PhotosState>): void => {
  builder
    .addCase(fetchThunk.fulfilled, (state) => {
      state.isLoading = false;
    })
    .addCase(fetchThunk.rejected, (state) => {
      state.isLoading = false;
    })
    .addCase(fetchTrashedPhotosThunk.fulfilled, (state) => {
      state.isLoadingTrashPhotos = false;
    })
    .addCase(fetchTrashedPhotosThunk.rejected, (state) => {
      state.isLoadingTrashPhotos = false;
    });
};

function makePhotosSerializable(photos: PhotoWithDownloadLink[]): SerializablePhoto[] {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return photos.map(({ takenAt, statusChangedAt, createdAt, updatedAt, ...rest }) => rest);
}
