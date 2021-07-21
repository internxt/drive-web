import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import selectors from './storageSelectors';
import thunks, { extraReducers } from './storageThunks';

export interface StorageState {
  isLoading: boolean;
  isDeletingItems: boolean;
  navigationStack: number[];
  currentFolderId: number;
  currentFolderBucket: string | null;
  items: any[];
  selectedItems: number[];
  itemToShareId: number;
  itemsToDeleteIds: number[];
  infoItemId: number;
  sortFunction: ((a: any, b: any) => number) | null;
  searchFunction: ((item: any) => boolean) | null;
}

const initialState: StorageState = {
  isLoading: false,
  isDeletingItems: false,
  navigationStack: [],
  currentFolderId: 0,
  currentFolderBucket: null,
  items: [],
  selectedItems: [],
  itemToShareId: 0,
  itemsToDeleteIds: [],
  infoItemId: 0,
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
    setItems: (state: StorageState, action: PayloadAction<any[]>) => {
      state.items = action.payload;
    },
    selectItem: (state: StorageState, action: PayloadAction<number>) => {
      state.selectedItems.push(action.payload);
    },
    deselectItem: (state: StorageState, action: PayloadAction<number>) => {
      state.selectedItems = state.selectedItems.filter(id => id !== action.payload);
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
    pushFolderToNavigation: (state: StorageState, action: PayloadAction<number>) => {
      state.navigationStack.push(action.payload);
    },
    popFolderFromNavigation: (state: StorageState) => {
      state.navigationStack.pop();
    },
    clearNavigationStack: (state: StorageState) => {
      state.navigationStack = [];
    }
  },
  extraReducers
});

export const {
  setCurrentFolderId,
  setCurrentFolderBucket,
  setIsLoading,
  setItems,
  selectItem,
  deselectItem,
  resetSelectedItems,
  setItemToShare,
  setItemsToDelete,
  setInfoItem,
  setSortFunction,
  pushFolderToNavigation,
  popFolderFromNavigation,
  clearNavigationStack
} = storageSlice.actions;

export const storageSelectors = selectors;

export const storageThunks = thunks;

export const storageActions = storageSlice.actions;

export default storageSlice.reducer;