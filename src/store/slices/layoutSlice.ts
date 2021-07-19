import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '..';

interface LayoutState {
  showFileLogger: boolean,
  showRegister: boolean
}

const initialState: LayoutState = {
  showFileLogger: false,
  showRegister: false
};

export const layoutSlice = createSlice({
  name: 'layout',
  initialState,
  reducers: {
    setShowFileLogger: (state, action: PayloadAction<boolean>) => {
      state.showFileLogger = action.payload;
    },
    setShowRegister: (state, action: PayloadAction<boolean>) => {
      state.showRegister = action.payload;
    }
  }
});

export const {
  setShowFileLogger,
  setShowRegister
} = layoutSlice.actions;
export const selectShowRegister = (state: RootState): boolean => state.layout.showRegister;
export default layoutSlice.reducer;