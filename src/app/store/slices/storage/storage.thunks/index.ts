import { ActionReducerMapBuilder } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { createFolderThunk, createFolderThunkExtraReducers } from './createFolderThunk';
import { deleteItemsThunk, deleteItemsThunkExtraReducers } from './deleteItemsThunk';
import { downloadFileThunk, downloadFileThunkExtraReducers } from './downloadFileThunk';
import { downloadFolderThunk, downloadFolderThunkExtraReducers } from './downloadFolderThunk';
import { downloadItemsThunk, downloadItemsThunkExtraReducers } from './downloadItemsThunk';
import { fetchDeletedThunk, fetchDeletedThunkExtraReducers } from './fetchDeletedThunk';
import { fetchFolderContentThunkExtraReducers, fetchPaginatedFolderContentThunk } from './fetchFolderContentThunk';
import { fetchRecentsThunk, fetchRecentsThunkExtraReducers } from './fetchRecentsThunk';
import { goToFolderThunk, goToFolderThunkExtraReducers, resetLoaderNavigationStatus } from './goToFolderThunk';
import { initializeThunk, initializeThunkExtraReducers } from './initializeThunk';
import { moveItemsThunk, moveItemsThunkExtraReducers } from './moveItemsThunk';
import { renameItemsThunk, renameItemsThunkExtraReducers } from './renameItemsThunk';
import { resetNamePathThunk, resetNamePathThunkExtraReducers } from './resetNamePathThunk';
import { updateItemMetadataThunk, updateItemMetadataThunkExtraReducers } from './updateItemMetadataThunk';
import { uploadFolderThunk, uploadFolderThunkExtraReducers, uploadFolderThunkNoCheck } from './uploadFolderThunk';
import { uploadItemsThunk, uploadItemsThunkExtraReducers, uploadSharedItemsThunk } from './uploadItemsThunk';

const storageThunks = {
  initializeThunk,
  resetNamePathThunk,
  uploadItemsThunk,
  downloadItemsThunk,
  downloadFileThunk,
  downloadFolderThunk,
  fetchPaginatedFolderContentThunk,
  deleteItemsThunk,
  goToFolderThunk,
  resetLoaderNavigationStatus,
  uploadFolderThunk,
  uploadFolderThunkNoCheck,
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
  downloadItemsThunkExtraReducers(builder);
  downloadFileThunkExtraReducers(builder);
  downloadFolderThunkExtraReducers(builder);
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
