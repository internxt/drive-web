import { ActionReducerMapBuilder } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { createFolderThunk, createFolderThunkExtraReducers } from './createFolderThunk';
import { deleteItemsThunk, deleteItemsThunkExtraReducers } from './deleteItemsThunk';
import { fetchDeletedThunk, fetchDeletedThunkExtraReducers } from './fetchDeletedThunk';
import { fetchFolderContentThunkExtraReducers, fetchPaginatedFolderContentThunk } from './fetchFolderContentThunk';
import {
  fetchRecentsThunk,
  fetchRecentsThunkExtraReducers,
} from '../../../../../views/Recents/services/fetchRecentsThunk';
import { goToFolderThunk, goToFolderThunkExtraReducers } from './goToFolderThunk';
import { initializeThunk, initializeThunkExtraReducers } from './initializeThunk';
import { moveItemsThunk, moveItemsThunkExtraReducers } from './moveItemsThunk';
import { renameItemsThunk, renameItemsThunkExtraReducers } from './renameItemsThunk';
import { resetNamePathThunk, resetNamePathThunkExtraReducers } from './resetNamePathThunk';
import { updateItemMetadataThunk, updateItemMetadataThunkExtraReducers } from './updateItemMetadataThunk';
import { uploadFolderThunk, uploadFolderThunkExtraReducers } from './uploadFolderThunk';
import { uploadItemsThunk, uploadItemsThunkExtraReducers, uploadSharedItemsThunk } from './uploadItemsThunk';

const storageThunks = {
  initializeThunk,
  resetNamePathThunk,
  uploadItemsThunk,
  fetchPaginatedFolderContentThunk,
  deleteItemsThunk,
  goToFolderThunk,
  uploadFolderThunk,
  updateItemMetadataThunk,
  fetchRecentsThunk,
  createFolderThunk,
  moveItemsThunk,
  fetchDeletedThunk,
  renameItemsThunk,
  uploadSharedItemsThunk,
};

export const storageExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  initializeThunkExtraReducers(builder);
  resetNamePathThunkExtraReducers(builder);
  uploadItemsThunkExtraReducers(builder);
  fetchFolderContentThunkExtraReducers(builder);
  deleteItemsThunkExtraReducers(builder);
  goToFolderThunkExtraReducers(builder);
  uploadFolderThunkExtraReducers(builder);
  updateItemMetadataThunkExtraReducers(builder);
  fetchRecentsThunkExtraReducers(builder);
  createFolderThunkExtraReducers(builder);
  moveItemsThunkExtraReducers(builder);
  fetchDeletedThunkExtraReducers(builder);
  renameItemsThunkExtraReducers(builder);
};

export default storageThunks;
