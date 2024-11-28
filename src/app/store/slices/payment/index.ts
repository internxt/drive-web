import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { t } from 'i18next';
import { RootState } from '../..';
import envService from '../../../core/services/env.service';
import errorService from '../../../core/services/error.service';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import paymentService, { CreatePaymentSessionPayload } from '../../../payment/services/payment.service';
import { ProductData, ProductPriceType, StripeSessionMode } from '../../../payment/types';

interface PaymentState {
  isBuying: boolean;
  currentPriceId: string;
}

const initialState: PaymentState = {
  isBuying: false,
  currentPriceId: '',
};

export interface CheckoutThunkPayload {
  product: ProductData;
}

export const checkoutThunk = createAsyncThunk<void, CheckoutThunkPayload, { state: RootState }>(
  'payment/checkout',
  async (payload: CheckoutThunkPayload) => {
    const body: CreatePaymentSessionPayload = {
      test: envService.isProduction() ? undefined : true,
      // eslint-disable-next-line max-len
      successUrl:
        process.env.REACT_APP_HOSTNAME +
        `/checkout/success?price_id=${payload.product.price.id}&cs_id={CHECKOUT_SESSION_ID}`,
      mode:
        payload.product.price.type === ProductPriceType.OneTime
          ? StripeSessionMode.Payment
          : StripeSessionMode.Subscription,
      priceId: payload.product.price.id,
    };
    body.lifetime_tier = payload.product.metadata.lifetime_tier;

    try {
      const session = await paymentService.createSession(body);

      await paymentService.redirectToCheckout({ sessionId: session.id });
    } catch (err: unknown) {
      const castedError = errorService.castError(err);

      notificationsService.show({
        text: t('error.redirectToStripe', {
          reason: castedError.message,
        }),
        type: ToastType.Error,
      });
    }
  },
);

export const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(checkoutThunk.pending, (state, action) => {
        state.isBuying = true;
        state.currentPriceId = action.meta.arg.product.price.id;
      })
      .addCase(checkoutThunk.fulfilled, (state) => {
        state.isBuying = false;
      })
      .addCase(checkoutThunk.rejected, (state) => {
        state.isBuying = false;
        state.currentPriceId = '';
      });
  },
});

export const paymentSelectors = {};

export const paymentActions = paymentSlice.actions;

export const paymentThunks = {
  checkoutThunk,
};

export default paymentSlice.reducer;
