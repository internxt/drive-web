import { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { PhotosState } from '..';
import { deleteThunk } from './delete';

import { fetchThunk, fetchThunkExtraReducers } from './fetch';

const photosThunks = {
  fetchThunk,
  deleteThunk,
};

export const photosExtraReducers = (builder: ActionReducerMapBuilder<PhotosState>): void => {
  fetchThunkExtraReducers(builder);
};

export default photosThunks;
