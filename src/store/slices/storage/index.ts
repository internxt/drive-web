import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FileViewMode } from '../../../models/enums';
import { DriveFileData, DriveFolderData, FolderPath } from '../../../models/interfaces';

import selectors from './storageSelectors';
import thunks, { extraReducers } from './storageThunks';

export interface StorageState {
  isLoading: boolean;
  isDeletingItems: boolean;
  isDraggingAnItem: boolean;
  draggingTargetItemData: DriveFolderData | DriveFileData | null;
  currentFolderId: number;
  currentFolderBucket: string | null;
  items: (DriveFileData | DriveFolderData)[];
  selectedItems: (DriveFileData | DriveFolderData)[];
  itemToShareId: number;
  itemsToDeleteIds: number[];
  infoItemId: number;
  viewMode: FileViewMode;
  namePath: FolderPath[];
  sortFunction: ((a: any, b: any) => number) | null;
  searchFunction: ((item: any) => boolean) | null;
}

const initialState: StorageState = {
  isLoading: false,
  isDeletingItems: false,
  isDraggingAnItem: false,
  draggingTargetItemData: null,
  currentFolderId: 0,
  currentFolderBucket: null,
  items: [],
  selectedItems: [],
  itemToShareId: 0,
  itemsToDeleteIds: [],
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
    setCurrentFolderId: (state: StorageState, action: PayloadAction<number>) => {
      state.currentFolderId = action.payload;
    },
    setCurrentFolderBucket: (state: StorageState, action: PayloadAction<string>) => {
      state.currentFolderBucket = action.payload;
    },
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
    selectItem: (state: StorageState, action: PayloadAction<DriveFileData | DriveFolderData>) => {
      state.selectedItems.push(action.payload);
    },
    deselectItem: (state: StorageState, action: PayloadAction<DriveFileData | DriveFolderData>) => {
      state.selectedItems = state.selectedItems.filter(item => item.id !== action.payload.id && item.isFolder !== action.payload.isFolder);
    },
    resetSelectedItems: (state: StorageState) => {
      state.selectedItems = [];
    },
    setItemToShare: (state: StorageState, action: PayloadAction<number>) => {
      state.itemToShareId = action.payload;
    },
    setItemsToDelete: (state: StorageState, action: PayloadAction<number[]>) => {
      state.itemsToDeleteIds = action.payload;
    },
    setInfoItem: (state: StorageState, action: PayloadAction<number>) => {
      state.infoItemId = action.payload;
    },
    setSortFunction: (state: StorageState, action: PayloadAction<((a: any, b: any) => number) | null>) => {
      state.sortFunction = action.payload;
    },
    setViewMode: (state: StorageState, action: PayloadAction<FileViewMode>) => {
      state.viewMode = action.payload;
    },
    goToNamePath: (state: StorageState, action: PayloadAction<number>) => {
      const folderIndex: number = state.namePath.map(path => path.id).indexOf(action.payload);

      state.namePath = state.namePath.slice(0, folderIndex + 1);
    },
    pushNamePath: (state: StorageState, action: PayloadAction<FolderPath>) => {
      if (!state.namePath.map(path => path.id).includes(action.payload.id)) {
        state.namePath.push(action.payload);
      }
    },
    popNamePath: (state: StorageState) => {
      state.namePath.pop();
    }
  },
  extraReducers
});

export const {
  setCurrentFolderId,
  setCurrentFolderBucket,
  setIsLoading,
  setIsDraggingAnItem,
  setDraggingItemTargetData,
  setItems,
  selectItem,
  deselectItem,
  resetSelectedItems,
  setItemToShare,
  setItemsToDelete,
  setInfoItem,
  setSortFunction,
  setViewMode,
  pushNamePath,
  popNamePath
} = storageSlice.actions;

export const storageSelectors = selectors;

export const storageThunks = thunks;

export const storageActions = storageSlice.actions;

export default storageSlice.reducer;