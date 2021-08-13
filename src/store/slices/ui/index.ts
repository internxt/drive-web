import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import queryString from 'query-string';

import history from '../../../lib/history';
interface UISliceState {
  isSidenavCollapsed: boolean;
  showFileLogger: boolean;
  isCreateFolderDialogOpen: boolean;
  isDeleteItemsDialogOpen: boolean;
  isReachedPlanLimitDialogOpen: boolean;
  isShareItemDialogOpen: boolean;
  isInviteMemberDialogOpen: boolean;
  isDriveItemInfoMenuOpen: boolean;
  currentAccountTab: string
}

const initialState: UISliceState = {
  isSidenavCollapsed: false,
  showFileLogger: false,
  isCreateFolderDialogOpen: false,
  isDeleteItemsDialogOpen: false,
  isReachedPlanLimitDialogOpen: false,
  isShareItemDialogOpen: false,
  isInviteMemberDialogOpen: false,
  isDriveItemInfoMenuOpen: false,
  currentAccountTab: 'billing'
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setIsSidenavCollapsed: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isSidenavCollapsed = action.payload;
    },
    setShowFileLogger: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.showFileLogger = action.payload;
    },
    setIsCreateFolderDialogOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isCreateFolderDialogOpen = action.payload;
    },
    setIsDeleteItemsDialogOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isDeleteItemsDialogOpen = action.payload;
    },
    setIsReachedPlanLimitDialogOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isReachedPlanLimitDialogOpen = action.payload;
    },
    setIsShareItemDialogOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isShareItemDialogOpen = action.payload;
    },
    setIsInviteMemberDialogOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isInviteMemberDialogOpen = action.payload;
    },
    setIsDriveItemInfoMenuOpen: (state: UISliceState, action: PayloadAction<boolean>) => {
      state.isDriveItemInfoMenuOpen = action.payload;
    },
    setCurrentAccountTab: (state: UISliceState, action: PayloadAction<string>) => {
      const currentQueryParams = queryString.parse(history.location.search);
      const newQueryParams = {
        ...currentQueryParams,
        tab: action.payload
      };
      const newQueryString = queryString.stringify(newQueryParams);

      state.currentAccountTab = action.payload;

      history.push({
        pathname: history.location.pathname,
        search: newQueryString && `?${newQueryString}`
      });
    },
    resetState: (state: UISliceState) => {
      Object.assign(state, initialState);
    }
  }
});

export const {
  setIsCreateFolderDialogOpen,
  setIsDeleteItemsDialogOpen,
  setShowFileLogger,
  setIsReachedPlanLimitDialogOpen,
  setIsShareItemDialogOpen,
  setIsInviteMemberDialogOpen,
  setIsDriveItemInfoMenuOpen,
  setCurrentAccountTab
} = uiSlice.actions;

export const uiActions = uiSlice.actions;

export default uiSlice.reducer;