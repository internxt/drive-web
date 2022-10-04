import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import queryString from 'query-string';

import { DriveFileData, DriveItemData } from '../../../drive/types';
import { FileInfoMenuItem } from '../../../drive/types';
import navigationService from '../../../core/services/navigation.service';
import { AccountViewTab } from '../../../core/views/AccountView/tabs';

interface UISliceState {
  isSidenavCollapsed: boolean;
  isReferralsWidgetCollapsed: boolean;
  isFileLoggerOpen: boolean;
  isFileInfoMenuOpen: boolean;
  isCreateFolderDialogOpen: boolean;
  isDeleteItemsDialogOpen: boolean;
  isNewsletterDialogOpen: boolean;
  isSurveyDialogOpen: boolean;
  isReachedPlanLimitDialogOpen: boolean;
  isSharedFolderTooBigDialogOpen: boolean,
  isShareItemDialogOpen: boolean;
  isInviteMemberDialogOpen: boolean;
  isDriveItemInfoMenuOpen: boolean;
  isGuestInviteDialogOpen: boolean;
  isFileViewerOpen: boolean;
  fileViewerItem: DriveFileData | null;
  currentAccountTab: AccountViewTab;
  currentFileInfoMenuItem: FileInfoMenuItem | null;
  currentEditingNameDriveItem: DriveItemData | null;
  currentEditingNameDirty: string;
}

const initialState: UISliceState = {
  isSidenavCollapsed: false,
  isReferralsWidgetCollapsed: false,
  isFileLoggerOpen: false,
  isFileInfoMenuOpen: false,
  isCreateFolderDialogOpen: false,
  isDeleteItemsDialogOpen: false,
  isNewsletterDialogOpen: false,
  isSurveyDialogOpen: false,
  isReachedPlanLimitDialogOpen: false,
  isSharedFolderTooBigDialogOpen: false,
  isShareItemDialogOpen: false,
  isInviteMemberDialogOpen: false,
  isDriveItemInfoMenuOpen: false,
  isGuestInviteDialogOpen: false,
  isFileViewerOpen: false,
  fileViewerItem: null,
  currentAccountTab: AccountViewTab.Info,
  currentFileInfoMenuItem: null,
  currentEditingNameDriveItem: null,
  currentEditingNameDirty: '',
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
    setIsCreateFolderDialogOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isCreateFolderDialogOpen = action.payload;
    },
    setIsDeleteItemsDialogOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isDeleteItemsDialogOpen = action.payload;
    },
    setIsNewsletterDialogOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isNewsletterDialogOpen = action.payload;
    },
    setIsSurveyDialogOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isSurveyDialogOpen = action.payload;
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
    setIsInviteMemberDialogOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isInviteMemberDialogOpen = action.payload;
    },
    setIsGuestInvitationDialogOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isGuestInviteDialogOpen = action.payload;
    },
    setIsDriveItemInfoMenuOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isDriveItemInfoMenuOpen = action.payload;
    },
    setIsFileViewerOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isFileViewerOpen = action.payload;
    },
    setFileViewerItem: (state: UISliceState, action: PayloadAction<DriveFileData>) => {
      state.fileViewerItem = action.payload;
    },
    setCurrentAccountTab: (state: UISliceState, action: PayloadAction<AccountViewTab>) => {
      const currentQueryParams = queryString.parse(navigationService.history.location.search);
      const newQueryParams = {
        ...currentQueryParams,
        tab: action.payload,
      };
      const newQueryString = queryString.stringify(newQueryParams);

      state.currentAccountTab = action.payload;

      navigationService.history.push({
        pathname: navigationService.history.location.pathname,
        search: newQueryString && `?${newQueryString}`,
      });
    },
    setFileInfoItem: (state: UISliceState, action: PayloadAction<FileInfoMenuItem | null>) => {
      state.currentFileInfoMenuItem = action.payload;
    },
    setCurrentEditingNameDriveItem: (state: UISliceState, action: PayloadAction<UISliceState['currentEditingNameDriveItem']>) => {
      state.currentEditingNameDriveItem = action.payload;
    },
    setCurrentEditingNameDirty: (state: UISliceState, action: PayloadAction<UISliceState['currentEditingNameDirty']>) => {
      state.currentEditingNameDirty = action.payload;
    },
    resetState: (state: UISliceState) => {
      Object.assign(state, initialState);
    },
  },
});

export const {
  setIsReferralsWidgetCollapsed,
  setIsCreateFolderDialogOpen,
  setIsDeleteItemsDialogOpen,
  setIsNewsletterDialogOpen,
  setIsSurveyDialogOpen,
  setIsFileLoggerOpen,
  setIsFileInfoMenuOpen,
  setIsReachedPlanLimitDialogOpen,
  setIsSharedFolderTooBigDialogOpen,
  setIsShareItemDialogOpen,
  setIsInviteMemberDialogOpen,
  setIsDriveItemInfoMenuOpen,
  setIsFileViewerOpen,
  setFileViewerItem,
  setCurrentAccountTab,
  setFileInfoItem,
  setIsGuestInvitationDialogOpen,
  setCurrentEditingNameDriveItem,
  setCurrentEditingNameDirty,
} = uiSlice.actions;

export const uiActions = uiSlice.actions;

export default uiSlice.reducer;
