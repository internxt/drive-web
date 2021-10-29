import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import userReferralsService from 'app/referrals/services/user-referrals.service';

import { UserReferral } from 'app/referrals/types';
import { RootState } from 'app/store';

interface ReferralsState {
  isLoading: boolean;
  list: UserReferral[];
}

const initialState: ReferralsState = {
  isLoading: false,
  list: [
    { id: 1, key: 'create-account', credit: 2, steps: 1 },
    { id: 2, key: 'install-mobile-app', credit: 1, steps: 1 },
    { id: 3, key: 'share-file', credit: 1, steps: 1 },
    { id: 4, key: 'subscribe-to-newsletter', credit: 1, steps: 1 },
    { id: 5, key: 'install-desktop-app', credit: 1, steps: 1 },
    { id: 6, key: 'invite-friends', credit: 4, steps: 4 },
  ],
};

export const fetchUserReferrals = createAsyncThunk<UserReferral[], void, { state: RootState }>(
  'referrals/fetchUserReferrals',
  () => {
    return userReferralsService.fetch();
  },
);

export const referralsSlice = createSlice({
  name: 'referrals',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserReferrals.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchUserReferrals.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload;
      })
      .addCase(fetchUserReferrals.rejected, (state) => {
        state.isLoading = false;
      });
  },
});

export const referralsActions = referralsSlice.actions;

export default referralsSlice.reducer;
