import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import usersReferralsService from 'app/referrals/services/users-referrals.service';

import { UserReferral } from 'app/referrals/types';
import { RootState } from 'app/store';

interface ReferralsState {
  isLoading: boolean;
  list: UserReferral[];
}

const initialState: ReferralsState = {
  isLoading: false,
  list: [],
};

const initializeThunk = createAsyncThunk<void, void, { state: RootState }>(
  'referrals/initialize',
  async (payload, { dispatch }) => {
    await dispatch(fetchUserReferralsThunk());
  },
);

const fetchUserReferralsThunk = createAsyncThunk<UserReferral[], void, { state: RootState }>(
  'referrals/fetchUserReferrals',
  () => {
    return usersReferralsService.fetch();
  },
);

export const referralsSlice = createSlice({
  name: 'referrals',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserReferralsThunk.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchUserReferralsThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload;
      })
      .addCase(fetchUserReferralsThunk.rejected, (state) => {
        state.isLoading = false;
      });
  },
});

export const referralsActions = referralsSlice.actions;

export const referralsThunks = {
  initializeThunk,
  fetchUserReferralsThunk,
};

export default referralsSlice.reducer;
