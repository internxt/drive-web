import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FileViewMode } from '../../../models/enums';
import { DriveFileData, DriveFolderData, DriveItemData, FolderPath } from '../../../models/interfaces';

import selectors from './storageSelectors';
import thunks, { extraReducers } from './storageThunks';

export interface StorageFilters {
  text: string;
}

export interface StorageSetFiltersPayload {
  text?: string;
}

function filtersFactory(): StorageFilters {
  return {
    text: ''
  };
}

interface itemRenamePayload {
  id: number,
  isFolder: boolean,
  name
}

export interface StorageState {
  isLoading: boolean;
  isDeletingItems: boolean;
  items: DriveItemData[];
  isLoadingRecents: boolean;
  recents: DriveItemData[];
  filters: StorageFilters;
  isDraggingAnItem: boolean;
  draggingTargetItemData: DriveItemData | null;
  selectedItems: DriveItemData[];
  itemToShareId: number;
  itemsToDelete: DriveItemData[];
  infoItemId: number;
  viewMode: FileViewMode;
  namePath: FolderPath[];
  sortFunction: ((a: DriveItemData, b: DriveItemData) => number) | null;
  searchFunction: ((item: DriveItemData) => boolean) | null;
}

const initialState: StorageState = {
  isLoading: false,
  isDeletingItems: false,
  items: [],
  isLoadingRecents: false,
  recents: [],
  filters: filtersFactory(),
  isDraggingAnItem: false,
  draggingTargetItemData: null,
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
    setIsLoadingRecents: (state: StorageState, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setIsDraggingAnItem: (state: StorageState, action: PayloadAction<boolean>) => {
      state.isDraggingAnItem = action.payload;
    },
    setDraggingItemTargetData: (state: StorageState, action: PayloadAction<DriveItemData | null>) => {
      state.draggingTargetItemData = action.payload;
    },
    setItems: (state: StorageState, action: PayloadAction<DriveItemData[]>) => {
      state.items = action.payload;
    },
    setRecents: (state: StorageState, action: PayloadAction<DriveFileData[]>) => {
      state.recents = action.payload;
    },
    setFilters: (state: StorageState, action: PayloadAction<StorageSetFiltersPayload>) => {
      Object.assign(state.filters, action.payload);
    },
    resetFilters: (state: StorageState) => {
      state.filters = filtersFactory();
    },
    selectItems: (state: StorageState, action: PayloadAction<DriveItemData[]>) => {
      const itemsToSelect = action.payload
        .filter(item => {
          return !state.selectedItems.some(i => item.id === i.id && item.isFolder === i.isFolder);
        });

      state.selectedItems.push(...itemsToSelect);
    },
    deselectItems: (state: StorageState, action: PayloadAction<DriveItemData[]>) => {
      action.payload.forEach(itemToDeselect => {
        const index: number = state.selectedItems.findIndex((item) => item.id === itemToDeselect.id && item.isFolder === itemToDeselect.isFolder);

        state.selectedItems.splice(index, 1);
      });
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
    },
    resetItemName: (state: StorageState, action: PayloadAction<itemRenamePayload>) => {
      for (let i=0; i < state.items.length; i++) {
        if (!!state.items[i].isFolder === action.payload.isFolder && state.items[i].id === action.payload.id) {
          state.items[i].name = action.payload.name;
          break;
        }
      }
    },
    addItems(state: StorageState, action: PayloadAction<DriveItemData>) {
      state.items.push(action.payload);
    }
  },
  extraReducers
});

export const {
  setIsLoading,
  setIsLoadingRecents,
  setIsDraggingAnItem,
  setDraggingItemTargetData,
  setItems,
  setRecents,
  setFilters,
  resetFilters,
  selectItems,
  deselectItems,
  clearSelectedItems,
  setItemToShare,
  setItemsToDelete,
  setInfoItem,
  setSortFunction,
  setViewMode,
  resetNamePath,
  pushNamePath,
  popNamePathUpTo,
  pathChangeWorkSpace,
  resetItemName,
  deleteItem,
  addItems
} = storageSlice.actions;

export const storageSelectors = selectors;

export const storageThunks = thunks;

export const storageActions = storageSlice.actions;

export default storageSlice.reducer;