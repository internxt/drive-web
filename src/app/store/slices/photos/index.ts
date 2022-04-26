import { PhotoId, PhotoWithDownloadLink } from '@internxt/sdk/dist/photos';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { photosExtraReducers } from './thunks';

export interface PhotosState {
  isLoading: boolean;
  skipped: number;
  thereIsMore: boolean;
  items: PhotoWithDownloadLink[];
  selectedItems: PhotoId[];
  bucketId?: string;
  previewIndex: number | null;
}

const initialState: PhotosState = {
  isLoading: false,
  skipped: 0,
  thereIsMore: true,
  items: [],
  selectedItems: [],
  previewIndex: null,
};

export const photosSlice = createSlice({
  name: 'photos',
  initialState,
  reducers: {
    setIsLoading: (state: PhotosState, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    push: (state: PhotosState, action: PayloadAction<PhotoWithDownloadLink[]>) => {
      state.items.push(...action.payload);
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
    setThereIsMore: (state: PhotosState, action: PayloadAction<boolean>) => {
      state.thereIsMore = action.payload;
    },
    setSkipped: (state: PhotosState, action: PayloadAction<number>) => {
      state.skipped = action.payload;
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
  },
  extraReducers: photosExtraReducers,
});

export default photosSlice.reducer;
