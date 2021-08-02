import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FileViewMode } from '../../../models/enums';
import { DriveFileData, DriveFolderData, DriveItemData, FolderPath } from '../../../models/interfaces';

import selectors from './storageSelectors';
import thunks, { extraReducers } from './storageThunks';

export interface StorageState {
  isLoading: boolean;
  isDeletingItems: boolean;
  isDraggingAnItem: boolean;
  draggingTargetItemData: DriveItemData | null;
  items: DriveItemData[];
  selectedItems: DriveItemData[];
  itemToShareId: number;
  itemsToDelete: DriveItemData[];
  infoItemId: number;
  viewMode: FileViewMode;
  namePath: FolderPath[];
  sortFunction: ((a: DriveFileData | DriveFolderData, b: DriveFileData | DriveFolderData) => number) | null;
  searchFunction: ((item: DriveFileData | DriveFolderData) => boolean) | null;
}

const initialState: StorageState = {
  isLoading: false,
  isDeletingItems: false,
  isDraggingAnItem: false,
  draggingTargetItemData: null,
  items: [],
  selectedItems: [],
  itemToShareId: 0,
  itemsToDelete: [],
  infoItemId: 0,
  viewMode: FileViewMode.List,
  namePath: [],
  sortFunction: null,
  searchFunction: null
};

export const storageSlice = createSlice({
  name: 'storage',
  initialState,
  reducers: {
    setIsLoading: (state: StorageState, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setIsDraggingAnItem: (state: StorageState, action: PayloadAction<boolean>) => {
      state.isDraggingAnItem = action.payload;
    },
    setDraggingItemTargetData: (state: StorageState, action: PayloadAction<any>) => {
      state.draggingTargetItemData = action.payload;
    },
    setItems: (state: StorageState, action: PayloadAction<any[]>) => {
      state.items = action.payload;
    },
    selectItem: (state: StorageState, action: PayloadAction<DriveItemData>) => {
      state.selectedItems.push(action.payload);
    },
    deselectItem: (state: StorageState, action: PayloadAction<DriveItemData>) => {
      const index: number = state.selectedItems.findIndex((item) => item.id === action.payload.id && item.isFolder === action.payload.isFolder);

      state.selectedItems.splice(index, 1);
    },
    clearSelectedItems: (state: StorageState) => {
      state.selectedItems = [];
    },
    setItemToShare: (state: StorageState, action: PayloadAction<number>) => {
      state.itemToShareId = action.payload;
    },
    setItemsToDelete: (state: StorageState, action: PayloadAction<DriveItemData[]>) => {
      state.itemsToDelete = action.payload;
    },
    setInfoItem: (state: StorageState, action: PayloadAction<number>) => {
      state.infoItemId = action.payload;
    },
    setSortFunction: (state: StorageState, action: PayloadAction<((a: DriveItemData, b: DriveItemData) => number) | null>) => {
      state.sortFunction = action.payload;
    },
    setViewMode: (state: StorageState, action: PayloadAction<FileViewMode>) => {
      state.viewMode = action.payload;
    },
    resetNamePath: (state: StorageState) => {
      state.namePath = [];
    },
    popNamePathUpTo: (state: StorageState, action: PayloadAction<FolderPath>) => {
      const folderIndex: number = state.namePath.map(path => path.id).indexOf(action.payload.id);

      state.namePath = state.namePath.slice(0, folderIndex + 1);
    },
    pushNamePath: (state: StorageState, action: PayloadAction<FolderPath>) => {
      if (!state.namePath.map(path => path.id).includes(action.payload.id)) {
        state.namePath.push(action.payload);
      }
    },
    pathChangeWorkSpace: (state: StorageState, action: PayloadAction<FolderPath>) => {
      state.namePath = [action.payload];
    }
  },
  extraReducers
});

export const {
  setIsLoading,
  setIsDraggingAnItem,
  setDraggingItemTargetData,
  setItems,
  selectItem,
  deselectItem,
  clearSelectedItems,
  setItemToShare,
  setItemsToDelete,
  setInfoItem,
  setSortFunction,
  setViewMode,
  resetNamePath,
  pushNamePath,
  popNamePathUpTo,
  pathChangeWorkSpace
} = storageSlice.actions;

export const storageSelectors = selectors;

export const storageThunks = thunks;

export const storageActions = storageSlice.actions;

export default storageSlice.reducer;