import { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { PhotosState } from '..';

import { fetchThunk, fetchThunkExtraReducers } from './fetch';

const photosThunks = {
  fetchThunk,
};

export const photosExtraReducers = (builder: ActionReducerMapBuilder<PhotosState>): void => {
  fetchThunkExtraReducers(builder);
};

export default photosThunks;
