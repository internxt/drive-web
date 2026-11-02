import { ActionReducerMapBuilder } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { createFolderThunk, createFolderThunkExtraReducers } from './createFolderThunk';
import { deleteItemsThunk, deleteItemsThunkExtraReducers } from './deleteItemsThunk';
import { fetchDeletedThunk, fetchDeletedThunkExtraReducers } from './fetchDeletedThunk';
import { fetchFolderContentThunkExtraReducers, fetchPaginatedFolderContentThunk } from './fetchFolderContentThunk';
import {
  fetchFavoritesThunk,
  fetchFavoritesThunkExtraReducers,
} from '../../../../../views/Favorites/store/fetchFavoritesThunk';
import {
  toggleFavoriteThunk,
  toggleFavoriteThunkExtraReducers,
} from '../../../../../views/Favorites/store/toggleFavoriteThunk';
import {
  fetchRecentsThunk,
  fetchRecentsThunkExtraReducers,
} from '../../../../../views/Recents/store/fetchRecentsThunk';
import { goToFolderThunk, goToFolderThunkExtraReducers } from './goToFolderThunk';
import { initializeThunk, initializeThunkExtraReducers } from './initializeThunk';
import { moveItemsThunk, moveItemsThunkExtraReducers } from './moveItemsThunk';
import { renameItemsThunk, renameItemsThunkExtraReducers } from './renameItemsThunk';
import { resetNamePathThunk, resetNamePathThunkExtraReducers } from './resetNamePathThunk';
import { updateItemMetadataThunk, updateItemMetadataThunkExtraReducers } from './updateItemMetadataThunk';

const storageThunks = {
  initializeThunk,
  resetNamePathThunk,
  fetchPaginatedFolderContentThunk,
  deleteItemsThunk,
  goToFolderThunk,
  updateItemMetadataThunk,
  fetchRecentsThunk,
  fetchFavoritesThunk,
  toggleFavoriteThunk,
  createFolderThunk,
  moveItemsThunk,
  fetchDeletedThunk,
  renameItemsThunk,
};

export const storageExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  initializeThunkExtraReducers(builder);
  resetNamePathThunkExtraReducers(builder);
  fetchFolderContentThunkExtraReducers(builder);
  deleteItemsThunkExtraReducers(builder);
  goToFolderThunkExtraReducers(builder);
  updateItemMetadataThunkExtraReducers(builder);
  fetchRecentsThunkExtraReducers(builder);
  fetchFavoritesThunkExtraReducers(builder);
  toggleFavoriteThunkExtraReducers(builder);
  createFolderThunkExtraReducers(builder);
  moveItemsThunkExtraReducers(builder);
  fetchDeletedThunkExtraReducers(builder);
  renameItemsThunkExtraReducers(builder);
};

export default storageThunks;
