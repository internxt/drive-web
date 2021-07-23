import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UISliceState {
  isSidenavCollapsed: boolean;
  isCreateFolderDialogOpen: boolean;
  isDeleteItemsDialogOpen: boolean;
  isFileLoggerOpen: boolean;
}

const initialState: UISliceState = {
  isSidenavCollapsed: false,
  isCreateFolderDialogOpen: false,
  isDeleteItemsDialogOpen: false,
  isFileLoggerOpen: false
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setIsSidenavCollapsed: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isSidenavCollapsed = action.payload;
    },
    setIsCreateFolderDialogOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isCreateFolderDialogOpen = action.payload;
    },
    setIsDeleteItemsDialogOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isDeleteItemsDialogOpen = action.payload;
    },
    showFileLogger: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isFileLoggerOpen = action.payload;
    }
  }
});

export const {
  setIsCreateFolderDialogOpen,
  setIsDeleteItemsDialogOpen,
  showFileLogger
} = uiSlice.actions;

export const uiActions = uiSlice.actions;

export default uiSlice.reducer;