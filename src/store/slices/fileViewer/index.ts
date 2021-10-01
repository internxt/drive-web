import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../..';

interface FileViewerState {
  isLoading: boolean;
  objectUrls: Record<string, string>;
}

const initialState: FileViewerState = {
  isLoading: false,
  objectUrls: {},
};

export const fileViewerSlice = createSlice({
  name: 'file-viewer',
  initialState,
  reducers: {
    setIsLoading: (state: FileViewerState, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setObjectUrl: (state: FileViewerState, action: PayloadAction<{ fileId: string; url: string }>) => {
      state.objectUrls[action.payload.fileId] = action.payload.url;
    },
    revokeObjectUrl: (state: FileViewerState, action: PayloadAction<string>) => {
      const objectUrl = state.objectUrls[action.payload];

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        delete state.objectUrls[action.payload];
      }
    },
    resetState: (state: FileViewerState) => {
      Object.assign(state, initialState);
    },
  },
});

export const fileViewerSelectors = {
  objectUrlByFileId(state: RootState): (fileId: string) => string | undefined {
    return (fileId) => state.fileViewer.objectUrls[fileId];
  },
};

export const fileViewerActions = fileViewerSlice.actions;

export default fileViewerSlice.reducer;
