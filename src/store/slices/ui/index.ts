import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../..';

interface UISliceState {
  isSidenavCollapsed: boolean;
  showCreateFolderModal: boolean;
  showDeleteModal: boolean;
  showFileLogger: boolean;
  showReachedLimitModal: boolean;
  showShareModal: boolean
  showInviteMemberModal: boolean;
}

const initialState: UISliceState = {
  isSidenavCollapsed: false,
  showCreateFolderModal: false,
  showDeleteModal: false,
  showFileLogger: false,
  showReachedLimitModal: false,
  showShareModal: false
  showInviteMemberModal: false
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setIsSidenavCollapsed: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isSidenavCollapsed = action.payload;
    },
    setShowCreateFolderModal: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.showCreateFolderModal = action.payload;
    },
    setShowDeleteModal: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.showDeleteModal = action.payload;
    },
    setShowFileLogger: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.showFileLogger = action.payload;
    },
    setShowReachedPlanLimit: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.showReachedLimitModal = action.payload;
    },
    setShowShareModal: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.showShareModal = action.payload;
    },
    setShowInviteMemberModal: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.showInviteMemberModal = action.payload;
    }
  }
});

export const {
  setShowCreateFolderModal,
  setShowDeleteModal,
  setShowFileLogger,
  setShowReachedPlanLimit,
  setShowShareModal
  setShowInviteMemberModal
} = uiSlice.actions;

export const uiActions = uiSlice.actions;
export const selectShowCreateFolderModal = (state: RootState): boolean => state.ui.showCreateFolderModal;
export const selectShowDeleteModal = (state: RootState): boolean => state.ui.showDeleteModal;
export const selectShowReachedLimitModal = (state: RootState): boolean => state.ui.showReachedLimitModal;
export const selectShowShareModal = (state: RootState): boolean => state.ui.showShareModal;
export const selectShowInviteMemberModal = (state: RootState): boolean => state.ui.showInviteMemberModal;
export default uiSlice.reducer;