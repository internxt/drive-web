import { PhotoId, PhotoWithDownloadLink } from '@internxt/sdk/dist/photos';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { photosExtraReducers } from './thunks';

export type SerializablePhoto = Omit<PhotoWithDownloadLink, 'statusChangedAt' | 'takenAt' | 'createdAt' | 'updatedAt'>;
export interface PhotosState {
  isLoading: boolean;
  skipped: number;
  thereIsMore: boolean;
  items: SerializablePhoto[];
  selectedItems: PhotoId[];
  bucketId?: string;
  previewIndex: number | null;
  isLoadingTrashPhotos: boolean;
  trashPhotos: SerializablePhoto[];
  selectedTrashPhotos: PhotoId[];
  previewTrashPhotoIndex: number | null;
  thereIsMoreTrashPhotos: boolean;
  skippedTrashPhotos: number;
}

const initialState: PhotosState = {
  isLoading: false,
  skipped: 0,
  thereIsMore: true,
  items: [],
  selectedItems: [],
  previewIndex: null,
  // TODO: CHECK WHEN FINISH TRASH IF IS NECESSARY TO CREATE ANOTHER SLICE
  isLoadingTrashPhotos: false,
  trashPhotos: [],
  selectedTrashPhotos: [],
  previewTrashPhotoIndex: null,
  thereIsMoreTrashPhotos: true,
  skippedTrashPhotos: 0,
};

export const photosSlice = createSlice({
  name: 'photos',
  initialState,
  reducers: {
    setIsLoading: (state: PhotosState, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    push: (state: PhotosState, action: PayloadAction<SerializablePhoto[]>) => {
      state.items.push(...action.payload);
    },
    pushTrashPhotos: (state: PhotosState, action: PayloadAction<SerializablePhoto[]>) => {
      state.trashPhotos.push(...action.payload);
    },
    toggleSelect: (state: PhotosState, action: PayloadAction<PhotoId>) => {
      const id = action.payload;
      const isAlreadySelected = state.selectedItems.some((el) => el === id);

      if (isAlreadySelected) {
        state.selectedItems = state.selectedItems.filter((el) => el !== id);
      } else {
        state.selectedItems.push(id);
      }
    },
    toggleSelectTrashPhotos: (state: PhotosState, action: PayloadAction<PhotoId>) => {
      const id = action.payload;
      const isAlreadySelected = state.selectedTrashPhotos.some((el) => el === id);

      if (isAlreadySelected) {
        state.selectedTrashPhotos = state.selectedTrashPhotos.filter((el) => el !== id);
      } else {
        state.selectedTrashPhotos.push(id);
      }
    },
    setThereIsMore: (state: PhotosState, action: PayloadAction<boolean>) => {
      state.thereIsMore = action.payload;
    },
    setThereIsMoreTrashPhotos: (state: PhotosState, action: PayloadAction<boolean>) => {
      state.thereIsMoreTrashPhotos = action.payload;
    },
    setSkipped: (state: PhotosState, action: PayloadAction<number>) => {
      state.skipped = action.payload;
    },
    setSkippedTrashPhotos: (state: PhotosState, action: PayloadAction<number>) => {
      state.skippedTrashPhotos = action.payload;
    },
    setBucketId: (state: PhotosState, action: PayloadAction<string>) => {
      state.bucketId = action.payload;
    },
    removeItems: (state: PhotosState, action: PayloadAction<PhotoId[]>) => {
      state.items = state.items.filter((item) => !action.payload.includes(item.id));
    },
    unselectAll: (state: PhotosState) => {
      state.selectedItems = [];
    },
    setPreviewIndex: (state: PhotosState, action: PayloadAction<PhotosState['previewIndex']>) => {
      state.previewIndex = action.payload;
    },
    setIsLoadingTrashPhotos: (state: PhotosState, action: PayloadAction<boolean>) => {
      state.isLoadingTrashPhotos = action.payload;
    },
    setPreviewTrashPhotoIndex: (state: PhotosState, action: PayloadAction<PhotosState['previewIndex']>) => {
      state.previewTrashPhotoIndex = action.payload;
    },
    unselectAllTrash: (state: PhotosState) => {
      state.selectedTrashPhotos = [];
    },
  },
  extraReducers: photosExtraReducers,
});

export default photosSlice.reducer;
