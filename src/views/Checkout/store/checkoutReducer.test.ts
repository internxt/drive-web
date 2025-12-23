import { describe, it, expect } from 'vitest';
import { checkoutReducer, initialStateForCheckout } from './checkoutReducer';
import { State } from './types';
import { DisplayPrice, UserType } from '@internxt/sdk/dist/drive/payments/types/types';

describe('checkoutReducer', () => {
  it('starts with the correct initial values', () => {
    expect(initialStateForCheckout.isPaying).toBe(false);
    expect(initialStateForCheckout.authMethod).toBe('signUp');
    expect(initialStateForCheckout.seatsForBusinessSubscription).toBe(1);
    expect(initialStateForCheckout.isUpdateSubscriptionDialogOpen).toBe(false);
    expect(initialStateForCheckout.isUpdatingSubscription).toBe(false);
    expect(initialStateForCheckout.prices).toEqual([]);
  });

  it('updates isPaying without affecting other state', () => {
    const customState: State = { ...initialStateForCheckout, authMethod: 'signIn' };

    const result = checkoutReducer(customState, { type: 'SET_IS_PAYING', payload: true });

    expect(result.isPaying).toBe(true);
    expect(result.authMethod).toBe('signIn');
    expect(result).not.toBe(customState);
  });

  it('updates isUpdateSubscriptionDialogOpen without affecting other state', () => {
    const customState: State = {
      ...initialStateForCheckout,
      isUpdatingSubscription: true,
      seatsForBusinessSubscription: 10,
    };

    const result = checkoutReducer(customState, { type: 'SET_IS_UPDATE_SUBSCRIPTION_DIALOG_OPEN', payload: true });

    expect(result.isUpdateSubscriptionDialogOpen).toBe(true);
    expect(result.isUpdatingSubscription).toBe(true);
    expect(result.seatsForBusinessSubscription).toBe(10);
  });

  it('updates isUpdatingSubscription without affecting other state', () => {
    const customState: State = { ...initialStateForCheckout, isUpdateSubscriptionDialogOpen: true };

    const result = checkoutReducer(customState, { type: 'SET_IS_UPDATING_SUBSCRIPTION', payload: true });

    expect(result.isUpdatingSubscription).toBe(true);
    expect(result.isUpdateSubscriptionDialogOpen).toBe(true);
  });

  it('updates prices without affecting other state', () => {
    const mockPrices: DisplayPrice[] = [
      {
        id: 'price_1',
        currency: 'usd',
        amount: 999,
        bytes: 107374182400,
        interval: 'month',
        userType: UserType.Individual,
      },
    ];
    const customState: State = { ...initialStateForCheckout, seatsForBusinessSubscription: 3 };

    const result = checkoutReducer(customState, { type: 'SET_PRICES', payload: mockPrices });

    expect(result.prices).toEqual(mockPrices);
    expect(result.seatsForBusinessSubscription).toBe(3);
  });

  it('updates authMethod without affecting other state', () => {
    const customState: State = { ...initialStateForCheckout, isPaying: true };

    const result = checkoutReducer(customState, { type: 'SET_AUTH_METHOD', payload: 'signIn' });

    expect(result.authMethod).toBe('signIn');
    expect(result.isPaying).toBe(true);
  });

  it('updates seatsForBusinessSubscription without affecting other state', () => {
    const customState: State = { ...initialStateForCheckout, isUpdatingSubscription: true };

    const result = checkoutReducer(customState, { type: 'SET_SEATS_FOR_BUSINESS_SUBSCRIPTION', payload: 5 });

    expect(result.seatsForBusinessSubscription).toBe(5);
    expect(result.isUpdatingSubscription).toBe(true);
  });

  it('returns the same state for unknown actions', () => {
    const result = checkoutReducer(initialStateForCheckout, {} as never);

    expect(result).toBe(initialStateForCheckout);
  });

  it('creates new state object on each update (immutability)', () => {
    const customState: State = { ...initialStateForCheckout, isPaying: true };

    const result = checkoutReducer(customState, { type: 'SET_IS_PAYING', payload: false });

    expect(result).not.toBe(customState);
    expect(customState.isPaying).toBe(true);
    expect(result.isPaying).toBe(false);
  });
});
