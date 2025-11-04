import { Dispatch } from 'react';
import { Action } from '../store';
import { AuthMethodTypes, CouponCodeData, ErrorType } from '../types';
import { StripeElementsOptions } from '@stripe/stripe-js';
import { DisplayPrice } from '@internxt/sdk/dist/drive/payments/types/types';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';

export const useCheckout = (dispatchReducer: Dispatch<Action>) => {
  const setUserNameFromElementAddress = (userName: string) =>
    dispatchReducer({ type: 'SET_USER_NAME_FROM_ADDRESS_ELEMENT', payload: userName });

  const setCouponCodeName = (coupon: string) => dispatchReducer({ type: 'SET_PROMO_CODE_NAME', payload: coupon });

  const onRemoveAppliedCouponCode = () => {
    dispatchReducer({ type: 'SET_COUPON_CODE_DATA', payload: undefined });
    dispatchReducer({ type: 'SET_PROMO_CODE_NAME', payload: undefined });
  };

  const setAuthMethod = (method: AuthMethodTypes) => {
    dispatchReducer({ type: 'SET_AUTH_METHOD', payload: method });
  };

  const setAvatarBlob = (avatarBlob: Blob | null) => {
    dispatchReducer({
      type: 'SET_AVATAR_BLOB',
      payload: avatarBlob ?? null,
    });
  };

  const setStripeElementsOptions = (stripeElementsOptions: StripeElementsOptions) => {
    dispatchReducer({
      type: 'SET_ELEMENTS_OPTIONS',
      payload: stripeElementsOptions,
    });
  };

  const setPrices = (prices: DisplayPrice[]) => {
    dispatchReducer({ type: 'SET_PRICES', payload: prices });
  };

  const setPlan = (plan: PriceWithTax) => {
    dispatchReducer({ type: 'SET_PLAN', payload: plan });
  };

  const setSeatsForBusinessSubscription = (seats: number) => {
    dispatchReducer({ type: 'SET_SEATS_FOR_BUSINESS_SUBSCRIPTION', payload: seats });
  };

  const setSelectedPlan = (selectedPlan: PriceWithTax) => {
    dispatchReducer({ type: 'SET_CURRENT_PLAN_SELECTED', payload: selectedPlan });
  };

  const setPromoCodeData = (promoCodeData: CouponCodeData | undefined) => {
    dispatchReducer({ type: 'SET_COUPON_CODE_DATA', payload: promoCodeData });
  };

  const setIsUserPaying = (isPaying: boolean) => {
    dispatchReducer({
      type: 'SET_IS_PAYING',
      payload: isPaying,
    });
  };

  const setIsCheckoutReadyToRender = (isCheckoutReadyToRender: boolean) => {
    dispatchReducer({
      type: 'SET_IS_CHECKOUT_READY_TO_RENDER',
      payload: isCheckoutReadyToRender,
    });
  };

  const setIsUpdateSubscriptionDialogOpen = (isUpdateSubDialogOpen: boolean) => {
    dispatchReducer({
      type: 'SET_IS_UPDATE_SUBSCRIPTION_DIALOG_OPEN',
      payload: isUpdateSubDialogOpen,
    });
  };

  const setIsUpdatingSubscription = (isUpdatingSub: boolean) => {
    dispatchReducer({
      type: 'SET_IS_UPDATING_SUBSCRIPTION',
      payload: isUpdatingSub,
    });
  };

  const setError = (type: ErrorType, error: string | undefined) => {
    dispatchReducer({
      type: 'SET_ERROR',
      payload: {
        [type]: error,
      },
    });
  };

  return {
    setAuthMethod,
    setError,
    setCouponCodeName,
    onRemoveAppliedCouponCode,
    setUserNameFromElementAddress,
    setAvatarBlob,
    setIsUserPaying,
    setPlan,
    setPromoCodeData,
    setSelectedPlan,
    setStripeElementsOptions,
    setSeatsForBusinessSubscription,
    setPrices,
    setIsCheckoutReadyToRender,
    setIsUpdateSubscriptionDialogOpen,
    setIsUpdatingSubscription,
  };
};
