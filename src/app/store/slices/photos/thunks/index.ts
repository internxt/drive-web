import { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { PhotosState } from '..';
import { deleteThunk } from './delete';
import { downloadThunk } from './download';

import { fetchThunk, fetchThunkExtraReducers } from './fetch';

const photosThunks = {
  fetchThunk,
  deleteThunk,
  downloadThunk,
};

export const photosExtraReducers = (builder: ActionReducerMapBuilder<PhotosState>): void => {
  fetchThunkExtraReducers(builder);
};

export default photosThunks;
