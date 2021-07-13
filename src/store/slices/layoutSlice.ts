import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '..';

interface LayoutState {
  showFileLogger: boolean
}

const initialState: LayoutState = {
  showFileLogger: false
};

export const layoutSlice = createSlice({
  name: 'layout',
  initialState,
  reducers: {
    showFileLogger: (state, action: PayloadAction<boolean>) => {
      state.showFileLogger = action.payload;
    }
  }
});

export const {
  showFileLogger
} = layoutSlice.actions;
export default layoutSlice.reducer;