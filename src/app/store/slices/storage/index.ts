import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import selectors from './storage.selectors';
import { storageExtraReducers } from '../storage/storage.thunks';
import { StorageState, StorageSetFiltersPayload, filtersFactory, orderFactory } from './storage.model';
import databaseService, { DatabaseCollection } from '../../../database/services/database.service';
import itemsListService from '../../../drive/services/items-list.service';
import { OrderDirection, OrderSettings } from '../../../core/types';
import { DriveItemData, DriveItemPatch, FileViewMode, FolderPath } from '../../../drive/types';

const initialState: StorageState = {
  loadingFolders: {},
  isDeletingItems: false,
  levels: {},
  recents: [],
  isLoadingRecents: false,
  filters: filtersFactory(),
  order: orderFactory('updatedAt', OrderDirection.Desc),
  selectedItems: [],
  itemToShare: null,
  itemsToDelete: [],
  viewMode: FileViewMode.List,
  namePath: [],
};

export const storageSlice = createSlice({
  name: 'storage',
  initialState,
  reducers: {
    setIsLoadingFolder: (state: StorageState, action: PayloadAction<{ folderId: number; value: boolean }>) => {
      state.loadingFolders[action.payload.folderId] = action.payload.value;
    },
    setIsLoadingRecents: (state: StorageState, action: PayloadAction<boolean>) => {
      state.isLoadingRecents = action.payload;
    },
    setItems: (state: StorageState, action: PayloadAction<{ folderId: number; items: DriveItemData[] }>) => {
      state.levels[action.payload.folderId] = action.payload.items;
    },
    setRecents: (state: StorageState, action: PayloadAction<DriveItemData[]>) => {
      state.recents = action.payload;
    },
    setFilters: (state: StorageState, action: PayloadAction<StorageSetFiltersPayload>) => {
      Object.assign(state.filters, action.payload);
    },
    setOrder: (state: StorageState, action: PayloadAction<Partial<OrderSettings>>) => {
      Object.assign(state.order, action.payload);
    },
    resetOrder: (state: StorageState) => {
      state.order = orderFactory('name', OrderDirection.Asc);
    },
    resetFilters: (state: StorageState) => {
      state.filters = filtersFactory();
    },
    selectItems: (state: StorageState, action: PayloadAction<DriveItemData[]>) => {
      const itemsToSelect = action.payload.filter((item) => {
        return !state.selectedItems.some((i) => item.id === i.id && item.isFolder === i.isFolder);
      });

      state.selectedItems.push(...itemsToSelect);
    },
    deselectItems: (state: StorageState, action: PayloadAction<DriveItemData[]>) => {
      action.payload.forEach((itemToDeselect) => {
        const index: number = state.selectedItems.findIndex(
          (item) => item.id === itemToDeselect.id && item.isFolder === itemToDeselect.isFolder,
        );

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
    setViewMode: (state: StorageState, action: PayloadAction<FileViewMode>) => {
      state.viewMode = action.payload;
    },
    resetNamePath: (state: StorageState) => {
      state.namePath = [];
    },
    popNamePathUpTo: (state: StorageState, action: PayloadAction<FolderPath>) => {
      const folderIndex: number = state.namePath.map((path) => path.id).indexOf(action.payload.id);

      state.namePath = state.namePath.slice(0, folderIndex + 1);
    },
    pushNamePath: (state: StorageState, action: PayloadAction<FolderPath>) => {
      if (!state.namePath.map((path) => path.id).includes(action.payload.id)) {
        state.namePath.push(action.payload);
      }
    },
    pathChangeWorkSpace: (state: StorageState, action: PayloadAction<FolderPath>) => {
      state.namePath = [action.payload];
    },
    patchItem: (
      state: StorageState,
      action: PayloadAction<{ id: number; folderId: number; isFolder: boolean; patch: DriveItemPatch }>,
    ) => {
      const { id, folderId, isFolder, patch } = action.payload;

      if (state.levels[folderId]) {
        const item = state.levels[folderId].find((i) => i.id === id && i.isFolder === isFolder);
        const itemIndex = state.levels[folderId].findIndex((i) => i.id === id && i.isFolder === isFolder);
        const itemsToDatabase = [...state.levels[folderId]];
        itemsToDatabase[itemIndex] = Object.assign({}, item, patch);

        state.levels[folderId] = itemsToDatabase;

        databaseService.put(DatabaseCollection.Levels, folderId, itemsToDatabase);
      }

      state.recents = state.recents.map((item) => {
        if (item.id === id && item.isFolder === isFolder) {
          Object.assign(item, patch);
        }
        return item;
      });

      state.selectedItems = state.selectedItems.map((item) => {
        if (item.id === id && item.isFolder === isFolder) {
          Object.assign(item, patch);
        }
        return item;
      });

      /* if (state.infoItem?.id === id && state.infoItem?.isFolder === isFolder) {
        Object.assign(state.infoItem, patch);
      } */
    },
    clearCurrentThumbnailItems: (
      state: StorageState,
      action: PayloadAction<{ folderId: number }>,
    ) => {
      const { folderId } = action.payload;

      if (state.levels[folderId]) {
        const itemsToDatabase = [] as DriveItemData[];
        state.levels[folderId].forEach((item) => {
          const newItem = Object.assign({}, item);
          newItem.currentThumbnail = null;
          itemsToDatabase.push(newItem);
        });

        state.levels[folderId] = itemsToDatabase;
        databaseService.put(DatabaseCollection.Levels, folderId, itemsToDatabase);
      }

      state.recents = state.recents.map((item) => {
        item.currentThumbnail = null;
        return item;
      });

      state.selectedItems = state.selectedItems.map((item) => {
        item.currentThumbnail = null;
        return item;
      });
    },
    pushItems(
      state: StorageState,
      action: PayloadAction<{ updateRecents?: boolean; folderIds?: number[]; items: DriveItemData | DriveItemData[] }>,
    ) {
      const itemsToPush = !Array.isArray(action.payload.items) ? [action.payload.items] : action.payload.items;
      const folderIds = action.payload.folderIds || Object.keys(state.levels).map((folderId) => parseInt(folderId));

      folderIds.forEach((folderId) => {
        const items = itemsListService.pushItems(itemsToPush, state.levels[folderId]);

        state.levels[folderId] = items;

        databaseService.put(DatabaseCollection.Levels, folderId, items);
      });

      if (action.payload.updateRecents) {
        state.recents = [...itemsToPush.filter((item) => !item.isFolder), ...state.recents];
      }
    },
    popItems(
      state: StorageState,
      action: PayloadAction<{ updateRecents?: boolean; folderIds?: number[]; items: DriveItemData | DriveItemData[] }>,
    ) {
      const folderIds = action.payload.folderIds || Object.keys(state.levels).map((folderId) => parseInt(folderId));
      const itemsToDelete = !Array.isArray(action.payload.items) ? [action.payload.items] : action.payload.items;

      folderIds.forEach((folderId) => {
        let items = [...state.levels[folderId]];

        items = items.filter(
          (item: DriveItemData) => !itemsToDelete.find((i) => i.id === item.id && i.isFolder === item.isFolder),
        );

        state.levels[folderId] = items;

        databaseService.put(DatabaseCollection.Levels, folderId, items);
      });

      if (action.payload.updateRecents) {
        state.recents = state.recents.filter(
          (item: DriveItemData) => !itemsToDelete.find((i) => i.id === item.id && i.isFolder === item.isFolder),
        );
      }
    },
    resetState(state: StorageState) {
      Object.assign(state, initialState);
    },
  },
  extraReducers: storageExtraReducers,
});

export const {
  setIsLoadingFolder,
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
  setViewMode,
  resetNamePath,
  pushNamePath,
  popNamePathUpTo,
  pathChangeWorkSpace,
  patchItem,
  pushItems,
  clearCurrentThumbnailItems,
} = storageSlice.actions;

export const storageSelectors = selectors;

export const storageActions = storageSlice.actions;

export default storageSlice.reducer;
