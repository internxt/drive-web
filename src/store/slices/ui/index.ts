import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UISliceState {
  isSidenavCollapsed: boolean;
  isCreateFolderDialogOpen: boolean;
  isDeleteItemsDialogOpen: boolean;
  showFileLogger: boolean;
  isReachedPlanLimitDialogOpen: boolean;
  isShareItemDialogOpen: boolean;
}

const initialState: UISliceState = {
  isSidenavCollapsed: false,
  isCreateFolderDialogOpen: false,
  isDeleteItemsDialogOpen: false,
  showFileLogger: false,
  isReachedPlanLimitDialogOpen: false,
  isShareItemDialogOpen: false
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
    setShowFileLogger: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.showFileLogger = action.payload;
    },
    setIsReachedPlanLimitDialogOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isReachedPlanLimitDialogOpen = action.payload;
    },
    setIsShareItemDialogOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isShareItemDialogOpen = action.payload;
    }
  }
});

export const {
  setIsCreateFolderDialogOpen,
  setIsDeleteItemsDialogOpen,
  setShowFileLogger,
  setIsReachedPlanLimitDialogOpen,
  setIsShareItemDialogOpen
} = uiSlice.actions;

export const uiActions = uiSlice.actions;

export default uiSlice.reducer;