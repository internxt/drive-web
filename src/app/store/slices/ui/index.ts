import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DriveItemData, DriveItemDetails, FileInfoMenuItem } from '../../../drive/types';
import { PreviewFileItem } from '../../../share/types';

interface UISliceState {
  isSidenavCollapsed: boolean;
  isReferralsWidgetCollapsed: boolean;
  isFileLoggerOpen: boolean;
  isFileInfoMenuOpen: boolean;
  isNameCollisionDialogOpen: boolean;
  isShareDialogOpen: boolean;
  isInvitationsDialogOpen: boolean;
  isItemDetailsDialogOpen: boolean;
  isCreateFolderDialogOpen: boolean;
  isDeleteItemsDialogOpen: boolean;
  isMoveItemsDialogOpen: boolean;
  isClearTrashDialogOpen: boolean;
  isEditFolderNameDialog: boolean;
  isPreferencesDialogOpen: boolean;
  isReachedPlanLimitDialogOpen: boolean;
  isSharedFolderTooBigDialogOpen: boolean;
  isShareItemDialogOpen: boolean;
  isShareItemDialogOpenInPreviewView: boolean;
  isUploadItemsFailsDialogOpen: boolean;
  isDriveItemInfoMenuOpen: boolean;
  isDeleteBackupDialogOpen: boolean;
  isFileViewerOpen: boolean;
  fileViewerItem: PreviewFileItem | null;
  itemDetails: DriveItemDetails | null;
  currentFileInfoMenuItem: FileInfoMenuItem | null;
  currentEditingNameDriveItem: DriveItemData | null;
  currentEditingNameDirty: string;
  isGlobalSearch: boolean;
  isShareWhithTeamDialogOpen: boolean;
}

const initialState: UISliceState = {
  isSidenavCollapsed: false,
  isReferralsWidgetCollapsed: false,
  isFileLoggerOpen: false,
  isFileInfoMenuOpen: false,
  isNameCollisionDialogOpen: false,
  isShareDialogOpen: false,
  isInvitationsDialogOpen: false,
  isItemDetailsDialogOpen: false,
  isCreateFolderDialogOpen: false,
  isDeleteItemsDialogOpen: false,
  isMoveItemsDialogOpen: false,
  isClearTrashDialogOpen: false,
  isEditFolderNameDialog: false,
  isPreferencesDialogOpen: false,
  isReachedPlanLimitDialogOpen: false,
  isSharedFolderTooBigDialogOpen: false,
  isShareItemDialogOpen: false,
  isShareItemDialogOpenInPreviewView: false,
  isUploadItemsFailsDialogOpen: false,
  isDriveItemInfoMenuOpen: false,
  isDeleteBackupDialogOpen: false,
  isFileViewerOpen: false,
  fileViewerItem: null,
  itemDetails: null,
  currentFileInfoMenuItem: null,
  currentEditingNameDriveItem: null,
  currentEditingNameDirty: '',
  isGlobalSearch: false,
  isShareWhithTeamDialogOpen: false,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setIsSidenavCollapsed: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isSidenavCollapsed = action.payload;
    },
    setIsReferralsWidgetCollapsed: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isReferralsWidgetCollapsed = action.payload;
    },
    setIsFileLoggerOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isFileLoggerOpen = action.payload;
    },
    setIsFileInfoMenuOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isFileInfoMenuOpen = action.payload;
    },
    setIsNameCollisionDialogOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isNameCollisionDialogOpen = action.payload;
    },
    setIsShareDialogOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isShareDialogOpen = action.payload;
    },
    setIsInvitationsDialogOpen(state: UISliceState, action: PayloadAction<boolean>) {
      state.isInvitationsDialogOpen = action.payload;
    },
    setIsItemDetailsDialogOpen(state: UISliceState, action: PayloadAction<boolean>) {
      state.isItemDetailsDialogOpen = action.payload;
    },
    setIsCreateFolderDialogOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isCreateFolderDialogOpen = action.payload;
    },
    setIsDeleteItemsDialogOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isDeleteItemsDialogOpen = action.payload;
    },
    setIsMoveItemsDialogOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isMoveItemsDialogOpen = action.payload;
    },
    setIsClearTrashDialogOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isClearTrashDialogOpen = action.payload;
    },
    setIsEditFolderNameDialog: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isEditFolderNameDialog = action.payload;
    },
    setIsPreferencesDialogOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isPreferencesDialogOpen = action.payload;
    },
    setIsReachedPlanLimitDialogOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isReachedPlanLimitDialogOpen = action.payload;
    },
    setIsSharedFolderTooBigDialogOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isSharedFolderTooBigDialogOpen = action.payload;
    },
    setIsShareItemDialogOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isShareItemDialogOpen = action.payload;
    },
    setIsShareItemDialogOpenInPreviewView: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isShareItemDialogOpenInPreviewView = action.payload;
    },
    setIsDeleteBackupDialog: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isDeleteBackupDialogOpen = action.payload;
    },
    setIsUploadItemsFailsDialogOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isUploadItemsFailsDialogOpen = action.payload;
    },
    setIsDriveItemInfoMenuOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isDriveItemInfoMenuOpen = action.payload;
    },
    setIsFileViewerOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isFileViewerOpen = action.payload;
    },
    setFileViewerItem: (state: UISliceState, action: PayloadAction<UISliceState['fileViewerItem']>) => {
      state.fileViewerItem = action.payload;
    },
    setItemDetailsItem: (state: UISliceState, action: PayloadAction<UISliceState['itemDetails']>) => {
      state.itemDetails = action.payload;
    },
    setFileInfoItem: (state: UISliceState, action: PayloadAction<FileInfoMenuItem | null>) => {
      state.currentFileInfoMenuItem = action.payload;
    },
    setCurrentEditingNameDriveItem: (
      state: UISliceState,
      action: PayloadAction<UISliceState['currentEditingNameDriveItem']>,
    ) => {
      state.currentEditingNameDriveItem = action.payload;
    },
    setCurrentEditingNameDirty: (
      state: UISliceState,
      action: PayloadAction<UISliceState['currentEditingNameDirty']>,
    ) => {
      state.currentEditingNameDirty = action.payload;
    },
    resetState: (state: UISliceState) => {
      Object.assign(state, initialState);
    },
    setIsGlobalSearch: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isGlobalSearch = action.payload;
    },
    setIsShareWhithTeamDialogOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isShareWhithTeamDialogOpen = action.payload;
    },
  },
});

export const {
  setIsReferralsWidgetCollapsed,
  setIsCreateFolderDialogOpen,
  setIsDeleteItemsDialogOpen,
  setIsMoveItemsDialogOpen,
  setIsPreferencesDialogOpen,
  setIsFileLoggerOpen,
  setIsFileInfoMenuOpen,
  setIsReachedPlanLimitDialogOpen,
  setIsSharedFolderTooBigDialogOpen,
  setIsShareItemDialogOpen,
  setIsDeleteBackupDialog,
  setIsUploadItemsFailsDialogOpen,
  setIsDriveItemInfoMenuOpen,
  setIsFileViewerOpen,
  setFileViewerItem,
  setFileInfoItem,
  setCurrentEditingNameDriveItem,
  setCurrentEditingNameDirty,
  setIsEditFolderNameDialog,
  setIsGlobalSearch,
  setIsItemDetailsDialogOpen,
  setIsShareWhithTeamDialogOpen,
} = uiSlice.actions;

export const uiActions = uiSlice.actions;

export default uiSlice.reducer;
