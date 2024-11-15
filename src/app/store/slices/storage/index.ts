import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { ShareLink } from '@internxt/sdk/dist/drive/share/types';
import { AdvancedSharedItem, SharedNamePath } from 'app/share/types';
import { OrderDirection, OrderSettings } from '../../../core/types';
import databaseService, { DatabaseCollection } from '../../../database/services/database.service';
import { DriveItemData, DriveItemPatch, FileViewMode, FolderPath } from '../../../drive/types';
import { storageExtraReducers } from '../storage/storage.thunks';
import { filtersFactory, orderFactory, StorageSetFiltersPayload, StorageState } from './storage.model';
import selectors from './storage.selectors';
import { IRoot } from './storage.thunks/uploadFolderThunk';

const initialState: StorageState = {
  loadingFolders: {},
  forceLoading: false,
  isDeletingItems: false,
  levels: {},
  moveDialogLevels: {},
  levelsFoldersLength: {},
  levelsFilesLength: {},
  hasMoreDriveFolders: {},
  hasMoreDriveFiles: {},
  recents: [],
  isLoadingRecents: false,
  isLoadingDeleted: false,
  filters: filtersFactory(),
  order: orderFactory('name', OrderDirection.Asc),
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
  currentPath: { uuid: '', name: '' },
  filesToRename: [],
  driveFilesToRename: [],
  foldersToRename: [],
  driveFoldersToRename: [],
  moveDestinationFolderId: null,
  folderPathDialog: [],
  driveItemsSort: 'plainName',
  driveItemsOrder: 'ASC',
  sharedNamePath: [],
};

export const removeDuplicates = (list: DriveItemData[]) => {
  const hash = {};
  return list.filter((obj) => {
    const key = obj.uuid ?? `${obj.id}-${obj.name}-${obj.updatedAt}-${obj.type}`;

    if (hash[key]) {
      return false;
    }
    hash[key] = true;
    return true;
  });
};

export const storageSlice = createSlice({
  name: 'storage',
  initialState,
  reducers: {
    setIsLoadingFolder: (state: StorageState, action: PayloadAction<{ folderId: string; value: boolean }>) => {
      state.loadingFolders[action.payload.folderId] = action.payload.value;
    },
    setForceLoading: (state: StorageState, action: PayloadAction<boolean>) => {
      state.forceLoading = action.payload;
    },
    setIsLoadingRecents: (state: StorageState, action: PayloadAction<boolean>) => {
      state.isLoadingRecents = action.payload;
    },
    setIsLoadingDeleted: (state: StorageState, action: PayloadAction<boolean>) => {
      state.isLoadingDeleted = action.payload;
    },
    setItems: (state: StorageState, action: PayloadAction<{ folderId: string; items: DriveItemData[] }>) => {
      state.levels[action.payload.folderId] = action.payload.items;
    },
    setMoveDialogItems: (state: StorageState, action: PayloadAction<{ folderId: string; items: DriveItemData[] }>) => {
      state.moveDialogLevels[action.payload.folderId] = action.payload.items;
    },
    addItems: (state: StorageState, action: PayloadAction<{ folderId: string; items: DriveItemData[] }>) => {
      const newFolderContent = (state.levels[action.payload.folderId] ?? []).concat(action.payload.items);
      const removedDuplicates = removeDuplicates(newFolderContent);
      state.levels[action.payload.folderId] = removedDuplicates;
    },
    setFolderFoldersLength: (
      state: StorageState,
      action: PayloadAction<{ folderId: string; foldersLength: number }>,
    ) => {
      state.levelsFoldersLength[action.payload.folderId] = action.payload.foldersLength;
    },
    setFolderFilesLength: (state: StorageState, action: PayloadAction<{ folderId: string; filesLength: number }>) => {
      state.levelsFilesLength[action.payload.folderId] = action.payload.filesLength;
    },
    addFolderFoldersLength: (
      state: StorageState,
      action: PayloadAction<{ folderId: string; foldersLength: number }>,
    ) => {
      const foldersLength = state.levelsFoldersLength[action.payload.folderId] ?? 0;
      state.levelsFoldersLength[action.payload.folderId] = foldersLength + action.payload.foldersLength;
    },
    addFolderFilesLength: (state: StorageState, action: PayloadAction<{ folderId: string; filesLength: number }>) => {
      const filesLength = state.levelsFilesLength[action.payload.folderId] ?? 0;
      state.levelsFilesLength[action.payload.folderId] = filesLength + action.payload.filesLength;
    },
    resetLevelsFoldersLength: (state: StorageState, action: PayloadAction<{ folderId: string }>) => {
      state.levelsFoldersLength[action.payload.folderId] = 0;
      state.levelsFilesLength[action.payload.folderId] = 0;
      state.levels[action.payload.folderId] = [];
    },
    setHasMoreDriveFolders: (state: StorageState, action: PayloadAction<{ folderId: string; status: boolean }>) => {
      state.hasMoreDriveFolders[action.payload.folderId] = action.payload.status;
    },
    setHasMoreDriveFiles: (state: StorageState, action: PayloadAction<{ folderId: string; status: boolean }>) => {
      state.hasMoreDriveFiles[action.payload.folderId] = action.payload.status;
    },
    resetDrivePagination: (state: StorageState) => {
      state.hasMoreDriveFolders[state.currentPath.uuid] = true;
      state.hasMoreDriveFiles[state.currentPath.uuid] = true;
    },
    setRecents: (state: StorageState, action: PayloadAction<DriveItemData[]>) => {
      state.recents = action.payload;
    },
    setItemsOnTrash: (state: StorageState, action: PayloadAction<DriveItemData[]>) => {
      state.itemsOnTrash = action.payload;
    },
    addItemsOnTrash: (state: StorageState, action: PayloadAction<DriveItemData[]>) => {
      const trashItems = state.itemsOnTrash.concat(action.payload);
      const trashItemsWithoutDuplicates = removeDuplicates(trashItems);
      state.itemsOnTrash = trashItemsWithoutDuplicates;
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
    setMoveDestinationFolderId: (state: StorageState, action: PayloadAction<string | null>) => {
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
    setItemToShare: (
      state: StorageState,
      action: PayloadAction<{
        share?: ShareLink;
        sharing?: { type: string; id: string };
        item: DriveItemData | (AdvancedSharedItem & { user: { email: string } });
      } | null>,
    ) => {
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
      const folderIndex: number = state.namePath.map((path) => path.uuid).indexOf(action.payload.uuid);

      state.namePath = state.namePath.slice(0, folderIndex + 1);
    },
    popNamePathDialogUpTo: (state: StorageState, action: PayloadAction<FolderPath>) => {
      const folderIndex: number = state.folderPathDialog.map((path) => path.uuid).indexOf(action.payload.uuid);
      state.folderPathDialog = state.folderPathDialog.slice(0, folderIndex + 1);
    },
    pushNamePath: (state: StorageState, action: PayloadAction<FolderPath>) => {
      if (!state.namePath.map((path) => path.uuid).includes(action.payload.uuid)) {
        state.namePath.push(action.payload);
      }
    },
    setNamePath: (state: StorageState, action: PayloadAction<FolderPath[]>) => {
      state.namePath = action.payload;
    },
    pushNamePathDialog: (state: StorageState, action: PayloadAction<FolderPath>) => {
      if (!state.folderPathDialog.map((path) => path.uuid).includes(action.payload.uuid)) {
        state.folderPathDialog.push(action.payload);
      }
    },
    resetSharedNamePath: (state: StorageState) => {
      state.sharedNamePath = [];
    },
    pushSharedNamePath: (state: StorageState, action: PayloadAction<SharedNamePath>) => {
      if (!state.sharedNamePath.map((path) => path.uuid).includes(action.payload.uuid)) {
        state.sharedNamePath.push(action.payload);
      }
    },
    popSharedNamePath: (state: StorageState, action: PayloadAction<SharedNamePath>) => {
      const folderIndex: number = state.sharedNamePath.map((path) => path.uuid).indexOf(action.payload.uuid);

      state.sharedNamePath = state.sharedNamePath.slice(0, folderIndex + 1);
    },
    pathChangeWorkSpace: (state: StorageState, action: PayloadAction<FolderPath>) => {
      state.namePath = [action.payload];
    },
    setCurrentPath: (state: StorageState, action: PayloadAction<FolderPath>) => {
      state.currentPath = action.payload;
    },
    patchItem: (
      state: StorageState,
      action: PayloadAction<{ uuid: string; folderId: string; isFolder: boolean; patch: DriveItemPatch }>,
    ) => {
      const { uuid, folderId, isFolder, patch } = action.payload;
      const folder = state.levels[folderId];
      const folderItems = folder && [...state.levels[folderId]];

      if (folderItems) {
        const item = folderItems.find((i) => i.uuid === uuid && !!i.isFolder === !!isFolder);
        const itemIndex = folderItems.findIndex((i) => i.uuid === uuid && !!i.isFolder === !!isFolder);
        const itemsToDatabase = [...folderItems];
        itemsToDatabase[itemIndex] = Object.assign({}, item, patch);

        state.levels[folderId] = itemsToDatabase;

        databaseService.put(DatabaseCollection.Levels, folderId, itemsToDatabase);
      }

      state.recents = state.recents.map((item) => {
        if (item.uuid === uuid && item.isFolder === isFolder) {
          Object.assign(item, patch);
        }
        return item;
      });

      state.selectedItems = state.selectedItems.map((item) => {
        if (item.uuid === uuid && item.isFolder === isFolder) {
          Object.assign(item, patch);
        }
        return item;
      });

      /* if (state.infoItem?.id === id && state.infoItem?.isFolder === isFolder) {
        Object.assign(state.infoItem, patch);
      } */
    },
    clearCurrentThumbnailItems: (state: StorageState, action: PayloadAction<{ folderId: string }>) => {
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
      action: PayloadAction<{ updateRecents?: boolean; folderIds?: string[]; items: DriveItemData | DriveItemData[] }>,
    ) {
      const itemsToPush = Array.isArray(action.payload.items) ? action.payload.items : [action.payload.items];
      const folderItems = action.payload.folderIds ?? Object.keys(state.levels).map((folderId) => folderId);
      const folderIds = Array.isArray(folderItems) ? folderItems : [folderItems];

      const uniqueNewItemsId = new Set(itemsToPush.map((item) => item.id));

      folderIds.forEach((folderId) => {
        const folderList = state.levels[folderId] ?? [];

        const filteredItems = folderList.filter((existingItem) => !uniqueNewItemsId.has(existingItem.id));
        const items = [...filteredItems, ...itemsToPush];

        state.levels[folderId] = items;

        databaseService.put(DatabaseCollection.Levels, folderId, items);
      });

      if (action.payload.updateRecents) {
        state.recents = [
          ...state.recents.filter((existingItem) => !uniqueNewItemsId.has(existingItem.id)),
          ...itemsToPush.filter((item) => !item.isFolder),
        ];
      }
    },
    popItems(
      state: StorageState,
      action: PayloadAction<{ updateRecents?: boolean; folderIds?: string[]; items: DriveItemData | DriveItemData[] }>,
    ) {
      const folderIds = action.payload.folderIds || Object.keys(state.levels).map((folderId) => folderId);
      const itemsToDelete = !Array.isArray(action.payload.items) ? [action.payload.items] : action.payload.items;

      folderIds.forEach((folderId) => {
        const folderItems = state.levels[folderId] ?? [];
        let items = [...folderItems];

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

    setDriveItemsSort: (state: StorageState, action: PayloadAction<string>) => {
      state.driveItemsSort = action.payload;
    },

    setDriveItemsOrder: (state: StorageState, action: PayloadAction<string>) => {
      state.driveItemsOrder = action.payload;
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
  setCurrentPath,
  pushNamePath,
  setNamePath,
  popNamePathUpTo,
  pathChangeWorkSpace,
  patchItem,
  pushItems,
  clearCurrentThumbnailItems,
  resetSharedNamePath,
} = storageSlice.actions;

export const storageSelectors = selectors;

export const storageActions = storageSlice.actions;

export default storageSlice.reducer;
