import { ActionReducerMapBuilder } from '@reduxjs/toolkit';

import { StorageState } from '..';
import { initializeThunk, initializeThunkExtraReducers } from './initializeThunk';
import { resetNamePathThunk, resetNamePathThunkExtraReducers } from './resetNamePathThunk';
import { uploadItemsThunk, uploadItemsThunkExtraReducers } from './uploadItemsThunk';
import { downloadItemsThunk, downloadItemsThunkExtraReducers } from './downloadItemsThunk';
import { createFolderThunk, createFolderThunkExtraReducers } from './createFolderThunk';
import { fetchRecentsThunk, fetchRecentsThunkExtraReducers } from './fetchRecentsThunk';
import { fetchFolderContentThunk, fetchFolderContentThunkExtraReducers } from './fetchFolderContentThunk';
import { deleteItemsThunk, deleteItemsThunkExtraReducers } from './deleteItemsThunk';
import { goToFolderThunk, goToFolderThunkExtraReducers } from './goToFolderThunk';
import { createFolderTreeStructureThunk, createFolderTreeStructureThunkExtraReducers } from './createFolderTreeStructureThunk';
import { updateItemMetadataThunk, updateItemMetadataThunkExtraReducers } from './updateItemMetadataThunk';
import { moveItemsThunk, moveItemsThunkExtraReducers } from './moveItemsThunk';

const storageThunks = {
  initializeThunk,
  resetNamePathThunk,
  uploadItemsThunk,
  downloadItemsThunk,
  fetchFolderContentThunk,
  deleteItemsThunk,
  goToFolderThunk,
  createFolderTreeStructureThunk,
  updateItemMetadataThunk,
  fetchRecentsThunk,
  createFolderThunk,
  moveItemsThunk
};

export const storageExtraReducers = (builder: ActionReducerMapBuilder<StorageState>): void => {
  initializeThunkExtraReducers(builder);
  resetNamePathThunkExtraReducers(builder);
  uploadItemsThunkExtraReducers(builder);
  downloadItemsThunkExtraReducers(builder);
  fetchFolderContentThunkExtraReducers(builder);
  deleteItemsThunkExtraReducers(builder);
  goToFolderThunkExtraReducers(builder);
  createFolderTreeStructureThunkExtraReducers(builder);
  updateItemMetadataThunkExtraReducers(builder);
  fetchRecentsThunkExtraReducers(builder);
  createFolderThunkExtraReducers(builder);
  moveItemsThunkExtraReducers(builder);
};

export default storageThunks;