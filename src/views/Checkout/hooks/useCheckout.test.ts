import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCheckout } from './useCheckout';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { StripeElementsOptions } from '@stripe/stripe-js';

describe('useCheckout hook actions', () => {
  const dispatch = vi.fn();

  const {
    setAuthMethod,
    setError,
    onRemoveAppliedCouponCode,
    setUserNameFromElementAddress,
    setAvatarBlob,
    setIsUserPaying,
    setPlan,
    setSelectedPlan,
    setStripeElementsOptions,
    setSeatsForBusinessSubscription,
    setIsCheckoutReadyToRender,
    setIsUpdateSubscriptionDialogOpen,
    setIsUpdatingSubscription,
  } = useCheckout(dispatch);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('When setAuthMethod is called, then it dispatches SET_AUTH_METHOD with the provided method', () => {
    setAuthMethod('signUp');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_AUTH_METHOD', payload: 'signUp' });
  });

  it('When setError is called, then it dispatches SET_ERROR with the provided error payload', () => {
    setError('auth', 'Invalid password');
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_ERROR',
      payload: { auth: 'Invalid password' },
    });
  });

  it('When onRemoveAppliedCouponCode is called, then it dispatches SET_COUPON_CODE_DATA and SET_PROMO_CODE_NAME with undefined', () => {
    onRemoveAppliedCouponCode();
    expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'SET_COUPON_CODE_DATA', payload: undefined });
    expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'SET_PROMO_CODE_NAME', payload: undefined });
  });

  it('When setUserNameFromElementAddress is called, then it dispatches SET_USER_NAME_FROM_ADDRESS_ELEMENT with the username', () => {
    setUserNameFromElementAddress('John Doe');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_USER_NAME_FROM_ADDRESS_ELEMENT', payload: 'John Doe' });
  });

  it('When setAvatarBlob is called, then it dispatches SET_AVATAR_BLOB with the provided Blob or null', () => {
    setAvatarBlob(null);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_AVATAR_BLOB', payload: null });
  });

  it('When setIsUserPaying is called, then it dispatches SET_IS_PAYING with the boolean value', () => {
    setIsUserPaying(true);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_IS_PAYING', payload: true });
  });

  it('When setPlan is called, then it dispatches SET_PLAN with the given plan', () => {
    const plan = { price: { id: 'id', interval: 'year', currency: 'eur' } } as PriceWithTax;
    setPlan(plan);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_PLAN', payload: plan });
  });

  it('When setSelectedPlan is called, then it dispatches SET_CURRENT_PLAN_SELECTED with the given plan', () => {
    const plan = { price: { id: 'id', interval: 'year', currency: 'eur' } } as PriceWithTax;
    setSelectedPlan(plan);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_CURRENT_PLAN_SELECTED', payload: plan });
  });

  it('When setStripeElementsOptions is called, then it dispatches SET_ELEMENTS_OPTIONS with the given options', () => {
    const options = { mode: 'subscription' } as StripeElementsOptions;
    setStripeElementsOptions(options);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_ELEMENTS_OPTIONS', payload: options });
  });

  it('When setSeatsForBusinessSubscription is called, then it dispatches SET_SEATS_FOR_BUSINESS_SUBSCRIPTION with the given seat count', () => {
    setSeatsForBusinessSubscription(5);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SEATS_FOR_BUSINESS_SUBSCRIPTION', payload: 5 });
  });

  it('When setIsCheckoutReadyToRender is called, then it dispatches SET_IS_CHECKOUT_READY_TO_RENDER with the boolean value', () => {
    setIsCheckoutReadyToRender(true);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_IS_CHECKOUT_READY_TO_RENDER', payload: true });
  });

  it('When setIsUpdateSubscriptionDialogOpen is called, then it dispatches SET_IS_UPDATE_SUBSCRIPTION_DIALOG_OPEN with the boolean value', () => {
    setIsUpdateSubscriptionDialogOpen(true);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_IS_UPDATE_SUBSCRIPTION_DIALOG_OPEN', payload: true });
  });

  it('When setIsUpdatingSubscription is called, then it dispatches SET_IS_UPDATING_SUBSCRIPTION with the boolean value', () => {
    setIsUpdatingSubscription(true);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_IS_UPDATING_SUBSCRIPTION', payload: true });
  });
});
