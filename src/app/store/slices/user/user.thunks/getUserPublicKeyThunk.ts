import { ActionReducerMapBuilder, createAsyncThunk } from '@reduxjs/toolkit';

import { RootState } from '../../..';
import { UserState } from '..';
import userService from '../../../../auth/services/user.service';

export const getUserPublicKeyThunk = createAsyncThunk<void, { email: string }, { state: RootState }>(
  'user/getPublicKey',
  async (payload: { email: string }, { dispatch }) => {
    const publicKeyResponse = await userService.getPublicKeyByEmail(payload.email);

    const publicKey = publicKeyResponse.publicKey;
    console.log({ publicKey });
  },
);

export const getUserPublicKeyThunkExtraReducers = (builder: ActionReducerMapBuilder<UserState>): void => {
  builder
    .addCase(getUserPublicKeyThunk.pending, (state) => {
      state.isFetchingUserPublicKey = true;
    })
    .addCase(getUserPublicKeyThunk.fulfilled, (state) => {
      state.isFetchingUserPublicKey = false;
    })
    .addCase(getUserPublicKeyThunk.rejected, (state) => {
      state.isFetchingUserPublicKey = false;
    });
};
