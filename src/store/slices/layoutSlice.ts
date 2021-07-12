import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '..';

interface LayoutState {
  showCreateFolder: boolean,
  showFileLogger: boolean
}

const initialState: LayoutState = {
  showCreateFolder: false,
  showFileLogger: false
};

export const layoutSlice = createSlice({
  name: 'layout',
  initialState,
  reducers: {
    showCreateFolder: (state, action: PayloadAction<boolean>) => {
      state.showCreateFolder = action.payload;
    },
    showFileLogger: (state, action: PayloadAction<boolean>) => {
      state.showFileLogger = action.payload;
    }
  }
});

export const {
  showCreateFolder,
  showFileLogger
} = layoutSlice.actions;
export const selectShowCreateFolder = (state: RootState) => state.layout.showCreateFolder;
export default layoutSlice.reducer;