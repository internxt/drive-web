import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { t } from 'i18next';
import { StorageState } from 'app/store/slices/storage/storage.model';
import { storageActions } from 'app/store/slices/storage';
import { RootState } from 'app/store';
import { excludeHiddenItems, getItemPlainName } from 'app/crypto/services/utils';
import errorService from 'services/error.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { DriveItemData } from 'app/drive/types';
import { fetchFavoriteFolders, fetchFavoriteFiles } from '../services';

const DEFAULT_LIMIT = 50;

const filterFolderItems = (item: DriveItemData) => item.isFolder;
const filterFilesItems = (item: DriveItemData) => !item.isFolder;

export const fetchFavoritesThunk = createAsyncThunk<void, void, { state: RootState }>(
  'storage/fetchFavorites',
  async (payload: void, { getState, dispatch, rejectWithValue }) => {
    const storageState = getState().storage;

    const hasMoreFavoriteFolders = storageState.hasMoreFavoriteFolders;
    const hasMoreFavoriteFiles = storageState.hasMoreFavoriteFiles;

    const foldersOffset = storageState.favorites.filter(filterFolderItems).length;
    const filesOffset = storageState.favorites.filter(filterFilesItems).length;

    try {
      let parsedItems: DriveItemData[];
      let itemsLength: number;

      if (hasMoreFavoriteFolders) {
        const folders = await fetchFavoriteFolders(DEFAULT_LIMIT, foldersOffset);

        parsedItems = folders.map((folder) => ({ ...folder, isFolder: true }) as unknown as DriveItemData);
        itemsLength = folders.length;
      } else if (hasMoreFavoriteFiles) {
        const files = await fetchFavoriteFiles(DEFAULT_LIMIT, filesOffset);

        parsedItems = files.map(
          (file) => ({ ...file, isFolder: false, size: Number(file.size) }) as unknown as DriveItemData,
        );
        itemsLength = files.length;
      } else {
        return;
      }

      const areLastItems = itemsLength < DEFAULT_LIMIT;

      const formattedItems = parsedItems.map((item) => ({
        ...item,
        name: getItemPlainName(item),
      }));
      const itemsWithoutHiddenItems = excludeHiddenItems(formattedItems);

      dispatch(storageActions.addFavorites(itemsWithoutHiddenItems));

      if (hasMoreFavoriteFolders) {
        dispatch(storageActions.setHasMoreFavoriteFolders(!areLastItems));
      } else {
        dispatch(storageActions.setHasMoreFavoriteFiles(!areLastItems));
      }
    } catch (error) {
      errorService.reportError(error);
      const castedError = errorService.castError(error);
      throw rejectWithValue(castedError);
    }
  },
);

export const fetchFavoritesThunkExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  builder
    .addCase(fetchFavoritesThunk.pending, (state) => {
      state.isLoadingFavorites = true;
    })
    .addCase(fetchFavoritesThunk.fulfilled, (state) => {
      state.isLoadingFavorites = false;
    })
    .addCase(fetchFavoritesThunk.rejected, (state, action) => {
      state.isLoadingFavorites = false;
      const isUnauthorizedError = (payload: unknown): payload is { status: number } =>
        typeof payload === 'object' && payload !== null && 'status' in payload && payload.status === 401;

      if (!isUnauthorizedError(action.payload)) {
        notificationsService.show({ text: t('error.fetchingFolderContent'), type: ToastType.Error });
      }
    });
};
