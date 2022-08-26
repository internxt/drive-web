import { ActionReducerMapBuilder } from '@reduxjs/toolkit';

import { StorageState } from '../storage.model';
import { initializeThunk, initializeThunkExtraReducers } from './initializeThunk';
import { resetNamePathThunk, resetNamePathThunkExtraReducers } from './resetNamePathThunk';
import { uploadItemsThunk, uploadItemsThunkExtraReducers } from './uploadItemsThunk';
import { downloadItemsThunk, downloadItemsThunkExtraReducers } from './downloadItemsThunk';
import { downloadFileThunk, downloadFileThunkExtraReducers } from './downloadFileThunk';
import { downloadFolderThunk, downloadFolderThunkExtraReducers } from './downloadFolderThunk';
import { createFolderThunk, createFolderThunkExtraReducers } from './createFolderThunk';
import { fetchRecentsThunk, fetchRecentsThunkExtraReducers } from './fetchRecentsThunk';
import { fetchFolderContentThunk, fetchFolderContentThunkExtraReducers } from './fetchFolderContentThunk';
import { deleteItemsThunk, deleteItemsThunkExtraReducers } from './deleteItemsThunk';
import { goToFolderThunk, goToFolderThunkExtraReducers } from './goToFolderThunk';
import { uploadFolderThunk, uploadFolderThunkExtraReducers } from './uploadFolderThunk';
import { updateItemMetadataThunk, updateItemMetadataThunkExtraReducers } from './updateItemMetadataThunk';
import { moveItemsThunk, moveItemsThunkExtraReducers } from './moveItemsThunk';
import { fetchDeletedThunk, fetchDeletedThunkExtraReducers } from './fetchDeletedThunk';

const storageThunks = {
  initializeThunk,
  resetNamePathThunk,
  uploadItemsThunk,
  downloadItemsThunk,
  downloadFileThunk,
  downloadFolderThunk,
  fetchFolderContentThunk,
  deleteItemsThunk,
  goToFolderThunk,
  uploadFolderThunk,
  updateItemMetadataThunk,
  fetchRecentsThunk,
  createFolderThunk,
  moveItemsThunk,
  fetchDeletedThunk,
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
};

export default storageThunks;
