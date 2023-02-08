import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import newsletterService from 'app/newsletter/services/newsletterService';
import { t } from 'i18next';

import { RootState } from '../..';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import { referralsThunks } from '../referrals';

interface NewsletterState {
  isSubscribing: boolean;
}

const initialState: NewsletterState = {
  isSubscribing: false,
};

export const subscribeToNewsletterThunk = createAsyncThunk<void, { email: string }, { state: RootState }>(
  'newsletter/subscribeToNewsletter',
  async (payload, { dispatch }) => {
    await newsletterService.subscribe(payload.email);
    dispatch(referralsThunks.refreshUserReferrals());
  },
);

export const newsletterSlice = createSlice({
  name: 'newsletter',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(subscribeToNewsletterThunk.pending, (state) => {
        state.isSubscribing = true;
      })
      .addCase(subscribeToNewsletterThunk.fulfilled, (state, action) => {
        state.isSubscribing = false;

        notificationsService.show({
          text: t('success.subscribeToNewsletter', { email: action.meta.arg.email }),

          type: ToastType.Info,
        });
      })
      .addCase(subscribeToNewsletterThunk.rejected, (state, action) => {
        state.isSubscribing = false;

        notificationsService.show({
          text: t('error.subscribeToNewsletter', { message: action.error.message }),
          type: ToastType.Error,
        });
      });
  },
});

export const newsletterActions = newsletterSlice.actions;

export const newsletterThunks = {
  subscribeToNewsletterThunk,
};

export default newsletterSlice.reducer;
