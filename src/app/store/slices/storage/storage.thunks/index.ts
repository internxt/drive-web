import { ActionReducerMapBuilder } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { initializeThunk, initializeThunkExtraReducers } from './initializeThunk';
import { resetNamePathThunk, resetNamePathThunkExtraReducers } from './resetNamePathThunk';
import { uploadItemsThunk, uploadItemsThunkExtraReducers, uploadSharedItemsThunk } from './uploadItemsThunk';
import { downloadItemsThunk, downloadItemsThunkExtraReducers } from './downloadItemsThunk';
import { downloadFileThunk, downloadFileThunkExtraReducers } from './downloadFileThunk';
import { downloadFolderThunk, downloadFolderThunkExtraReducers } from './downloadFolderThunk';
import { createFolderThunk, createFolderThunkExtraReducers } from './createFolderThunk';
import { fetchRecentsThunk, fetchRecentsThunkExtraReducers } from './fetchRecentsThunk';
import { fetchPaginatedFolderContentThunk, fetchFolderContentThunkExtraReducers } from './fetchFolderContentThunk';
import { deleteItemsThunk, deleteItemsThunkExtraReducers } from './deleteItemsThunk';
import { goToFolderThunk, goToFolderThunkExtraReducers } from './goToFolderThunk';
import { uploadFolderThunk, uploadFolderThunkNoCheck, uploadFolderThunkExtraReducers } from './uploadFolderThunk';
import { updateItemMetadataThunk, updateItemMetadataThunkExtraReducers } from './updateItemMetadataThunk';
import { moveItemsThunk, moveItemsThunkExtraReducers } from './moveItemsThunk';
import { fetchDeletedThunk, fetchDeletedThunkExtraReducers } from './fetchDeletedThunk';
import { renameItemsThunk, renameItemsThunkExtraReducers } from './renameItemsThunk';

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
