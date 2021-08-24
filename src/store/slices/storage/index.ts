import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FileViewMode, StorageItemList } from '../../../models/enums';
import { DriveItemData, DriveItemPatch, FolderPath } from '../../../models/interfaces';
import arrayService from '../../../services/array.service';

import selectors from './storage.selectors';
import { storageExtraReducers } from '../storage/storage.thunks';
import { StorageState, StorageSetFiltersPayload, filtersFactory } from './storage.model';

const initialState: StorageState = {
  isLoading: false,
  isDeletingItems: false,
  lists: {
    [StorageItemList.Drive]: [],
    [StorageItemList.Recents]: []
  },
  isLoadingRecents: false,
  filters: filtersFactory(),
  selectedItems: [],
  itemToShare: null,
  itemsToDelete: [],
  infoItem: null,
  viewMode: FileViewMode.List,
  namePath: []
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
    setItems: (state: StorageState, action: PayloadAction<DriveItemData[]>) => {
      state.lists.drive = action.payload;
    },
    setRecents: (state: StorageState, action: PayloadAction<DriveItemData[]>) => {
      state.lists.recents = action.payload;
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
    setItemToShare: (state: StorageState, action: PayloadAction<DriveItemData | null>) => {
      state.itemToShare = action.payload;
    },
    setItemsToDelete: (state: StorageState, action: PayloadAction<DriveItemData[]>) => {
      state.itemsToDelete = action.payload;
    },
    setInfoItem: (state: StorageState, action: PayloadAction<DriveItemData | null>) => {
      state.infoItem = action.payload;
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
    patchItem: (state: StorageState, action: PayloadAction<{ id: number, isFolder: boolean, patch: DriveItemPatch }>) => {
      const { id, isFolder, patch } = action.payload;

      Object.values(state.lists).forEach(list => {
        const item = list.find(i => i.id === id && i.isFolder === isFolder);

        item && Object.assign(item, patch);
      });

      if (state.infoItem?.id === id) {
        Object.assign(state.infoItem, patch);
      }
    },
    pushItems(state: StorageState, action: PayloadAction<{ list: StorageItemList, items: DriveItemData | DriveItemData[] }>) {
      action.payload.items = !Array.isArray(action.payload.items) ? [action.payload.items] : action.payload.items;

      const folders = action.payload.items.filter(item => item.isFolder);
      const files = action.payload.items.filter(item => !item.isFolder);
      const lastFolderIndex = state.lists[action.payload.list].filter(item => item.isFolder).length;

      arrayService.insertAt(
        state.lists[action.payload.list],
        lastFolderIndex,
        folders
      );
      state.lists[action.payload.list].push(...files);
    },
    popItems(state: StorageState, action: PayloadAction<{ lists?: StorageItemList[], items: DriveItemData | DriveItemData[]}>) {
      const listsToUpdate = action.payload.lists || Object.values(StorageItemList);
      const itemsToDelete = !Array.isArray(action.payload.items) ? [action.payload.items] : action.payload.items;

      listsToUpdate.forEach(listKey => {
        state.lists[listKey] = state.lists[listKey].filter((item:DriveItemData) => !itemsToDelete.find((i) => i.id === item.id));
      });
    },
    resetState(state: StorageState) {
      Object.assign(state, initialState);
    }
  },
  extraReducers: storageExtraReducers
});

export const {
  setIsLoading,
  setIsLoadingRecents,
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
  setViewMode,
  resetNamePath,
  pushNamePath,
  popNamePathUpTo,
  pathChangeWorkSpace,
  patchItem,
  pushItems
} = storageSlice.actions;

export const storageSelectors = selectors;

export const storageActions = storageSlice.actions;

export default storageSlice.reducer;