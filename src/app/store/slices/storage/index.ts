import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import selectors from './storage.selectors';
import { storageExtraReducers } from '../storage/storage.thunks';
import { filtersFactory, orderFactory, StorageSetFiltersPayload, StorageState } from './storage.model';
import databaseService, { DatabaseCollection } from '../../../database/services/database.service';
import itemsListService from '../../../drive/services/items-list.service';
import { OrderDirection, OrderSettings } from '../../../core/types';
import { DriveItemData, DriveItemPatch, FileViewMode, FolderPath } from '../../../drive/types';
import { ShareLink } from '@internxt/sdk/dist/drive/share/types';
import { IRoot } from './storage.thunks/uploadFolderThunk';

const initialState: StorageState = {
  loadingFolders: {},
  isDeletingItems: false,
  levels: {},
  recents: [],
  isLoadingRecents: false,
  isLoadingDeleted: false,
  filters: filtersFactory(),
  order: orderFactory('updatedAt', OrderDirection.Desc),
  selectedItems: [],
  itemToShare: null,
  itemsToDelete: [],
  itemsToMove: [],
  itemToRename: null,
  itemsOnTrash: [],
  folderOnTrashLength: 0,
  filesOnTrashLength: 0,
  viewMode: FileViewMode.List,
  namePath: [],
  filesToRename: [],
  driveFilesToRename: [],
  foldersToRename: [],
  driveFoldersToRename: [],
  moveDestinationFolderId: null,
  folderPathDialog: [],
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
    setIsLoadingDeleted: (state: StorageState, action: PayloadAction<boolean>) => {
      state.isLoadingDeleted = action.payload;
    },
    setItems: (state: StorageState, action: PayloadAction<{ folderId: number; items: DriveItemData[] }>) => {
      state.levels[action.payload.folderId] = action.payload.items;
    },
    setRecents: (state: StorageState, action: PayloadAction<DriveItemData[]>) => {
      state.recents = action.payload;
    },
    setItemsOnTrash: (state: StorageState, action: PayloadAction<DriveItemData[]>) => {
      state.itemsOnTrash = action.payload;
    },
    addItemsOnTrash: (state: StorageState, action: PayloadAction<DriveItemData[]>) => {
      state.itemsOnTrash = state.itemsOnTrash.concat(action.payload);
    },
    setFoldersOnTrashLength: (state: StorageState, action: PayloadAction<number>) => {
      state.folderOnTrashLength = action.payload;
    },
    setFilesOnTrashLength: (state: StorageState, action: PayloadAction<number>) => {
      state.filesOnTrashLength = action.payload;
    },
    resetTrash: (state: StorageState) => {
      state.filesOnTrashLength = 0;
      state.folderOnTrashLength = 0;
      state.itemsOnTrash = [];
    },
    addFoldersOnTrashLength: (state: StorageState, action: PayloadAction<number>) => {
      state.folderOnTrashLength += action.payload;
    },
    addFilesOnTrashLength: (state: StorageState, action: PayloadAction<number>) => {
      state.filesOnTrashLength += action.payload;
    },
    setFilesToRename: (state: StorageState, action: PayloadAction<(File | DriveItemData)[]>) => {
      state.filesToRename = action.payload;
    },
    setDriveFilesToRename: (state: StorageState, action: PayloadAction<DriveItemData[]>) => {
      state.driveFilesToRename = action.payload;
    },
    setFoldersToRename: (state: StorageState, action: PayloadAction<(DriveItemData | IRoot)[]>) => {
      state.foldersToRename = action.payload;
    },
    setDriveFoldersToRename: (state: StorageState, action: PayloadAction<DriveItemData[]>) => {
      state.driveFoldersToRename = action.payload;
    },
    setMoveDestinationFolderId: (state: StorageState, action: PayloadAction<number | null>) => {
      state.moveDestinationFolderId = action.payload;
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
    setItemToShare: (state: StorageState, action: PayloadAction<{ share?: ShareLink; item: DriveItemData } | null>) => {
      state.itemToShare = action.payload;
    },
    setItemsToDelete: (state: StorageState, action: PayloadAction<DriveItemData[]>) => {
      state.itemsToDelete = action.payload;
    },
    setItemsToMove: (state: StorageState, action: PayloadAction<DriveItemData[]>) => {
      state.itemsToMove = action.payload;
    },
    setItemToRename: (state: StorageState, action: PayloadAction<DriveItemData | null>) => {
      state.itemToRename = action.payload;
    },
    setViewMode: (state: StorageState, action: PayloadAction<FileViewMode>) => {
      state.viewMode = action.payload;
    },
    resetNamePath: (state: StorageState) => {
      state.namePath = [];
    },
    popItemsToDelete: (state: StorageState, action: PayloadAction<DriveItemData[]>) => {
      action.payload.forEach((itemToPop) => {
        const index: number = state.itemsOnTrash.findIndex(
          (item) => item.id === itemToPop.id && item.isFolder === itemToPop.isFolder,
        );

        state.itemsOnTrash.splice(index, 1);
      });
    },
    popNamePathUpTo: (state: StorageState, action: PayloadAction<FolderPath>) => {
      const folderIndex: number = state.namePath.map((path) => path.id).indexOf(action.payload.id);

      state.namePath = state.namePath.slice(0, folderIndex + 1);
    },
    popNamePathDialogUpTo: (state: StorageState, action: PayloadAction<FolderPath>) => {
      const folderIndex: number = state.folderPathDialog.map((path) => path.id).indexOf(action.payload.id);
      state.folderPathDialog = state.folderPathDialog.slice(0, folderIndex + 1);
    },
    pushNamePath: (state: StorageState, action: PayloadAction<FolderPath>) => {
      if (!state.namePath.map((path) => path.id).includes(action.payload.id)) {
        state.namePath.push(action.payload);
      }
    },
    pushNamePathDialog: (state: StorageState, action: PayloadAction<FolderPath>) => {
      if (!state.folderPathDialog.map((path) => path.id).includes(action.payload.id)) {
        state.folderPathDialog.push(action.payload);
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
    clearCurrentThumbnailItems: (state: StorageState, action: PayloadAction<{ folderId: number }>) => {
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
      const itemsToPush = Array.isArray(action.payload.items) ? action.payload.items : [action.payload.items];
      const folderItems = action.payload.folderIds || Object.keys(state.levels).map((folderId) => parseInt(folderId));
      const folderIds = Array.isArray(folderItems) ? folderItems : [folderItems];

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
  setIsLoadingDeleted,
  setItems,
  setFilesToRename,
  setDriveFilesToRename,
  setRecents,
  setFilters,
  resetFilters,
  selectItems,
  deselectItems,
  clearSelectedItems,
  setItemToShare,
  setItemsToDelete,
  setItemsToMove,
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
