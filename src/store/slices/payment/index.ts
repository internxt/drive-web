import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { RootState } from '../..';
import { ProductPriceType, StripeSessionMode } from '../../../models/enums';
import { ProductData } from '../../../models/interfaces';
import analyticsService from '../../../services/analytics.service';
import envService from '../../../services/env.service';
import errorService from '../../../services/error.service';
import i18n from '../../../services/i18n.service';
import notificationsService, { ToastType } from '../../../services/notifications.service';
import paymentService, { CreatePaymentSessionPayload } from '../../../services/payment.service';

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

export interface TeamsCheckoutThunkPayload {
  product: ProductData;
  teamMembersCount: number;
}

export const checkoutThunk = createAsyncThunk<void, CheckoutThunkPayload, { state: RootState }>(
  'payment/checkout',
  async (payload: CheckoutThunkPayload) => {
    const body: CreatePaymentSessionPayload = {
      test: envService.isProduction() ? undefined : true,
      mode:
        payload.product.price.type === ProductPriceType.OneTime
          ? StripeSessionMode.Payment
          : StripeSessionMode.Subscription,
      priceId: payload.product.price.id,
    };
    body.lifetime_tier = payload.product.metadata.lifetime_tier;

    try {
      const session = await paymentService.createSession(body);

      analyticsService.trackUserEnterPayments();

      await paymentService.redirectToCheckout({ sessionId: session.id });
    } catch (err: unknown) {
      const castedError = errorService.castError(err);

      notificationsService.show(
        i18n.get('error.redirectToStripe', {
          reason: castedError.message,
        }),
        ToastType.Error,
      );
    }
  },
);

export const teamsCheckoutThunk = createAsyncThunk<void, TeamsCheckoutThunkPayload, { state: RootState }>(
  'payment/teamsCheckout',
  async (payload: TeamsCheckoutThunkPayload) => {
    const mode =
      payload.product.price.type === ProductPriceType.OneTime
        ? StripeSessionMode.Payment
        : StripeSessionMode.Subscription;

    try {
      await paymentService.handlePaymentTeams(payload.product.price.id, payload.teamMembersCount, mode);
    } catch (err: unknown) {
      const castedError = errorService.castError(err);

      notificationsService.show(
        i18n.get('error.redirectToStripe', {
          reason: castedError.message,
        }),
        ToastType.Error,
      );
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

    builder
      .addCase(teamsCheckoutThunk.pending, (state, action) => {
        state.isBuying = true;
        state.currentPriceId = action.meta.arg.product.price.id;
      })
      .addCase(teamsCheckoutThunk.fulfilled, (state) => {
        state.isBuying = false;
      })
      .addCase(teamsCheckoutThunk.rejected, (state) => {
        state.isBuying = false;
        state.currentPriceId = '';
      });
  },
});

export const paymentSelectors = {};

export const paymentActions = paymentSlice.actions;

export const paymentThunks = {
  checkoutThunk,
  teamsCheckoutThunk,
};

export default paymentSlice.reducer;
