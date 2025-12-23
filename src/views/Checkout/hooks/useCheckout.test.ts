import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCheckout } from './useCheckout';

describe('useCheckout hook', () => {
  const dispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('When setAuthMethod is called, then it dispatches SET_AUTH_METHOD with the provided method', () => {
    const { result } = renderHook(() => useCheckout(dispatch));
    result.current.setAuthMethod('signUp');
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_AUTH_METHOD', payload: 'signUp' });
  });

  it('When setIsUserPaying is called, then it dispatches SET_IS_PAYING with the boolean value', () => {
    const { result } = renderHook(() => useCheckout(dispatch));
    result.current.setIsUserPaying(true);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_IS_PAYING', payload: true });
  });

  it('When setSeatsForBusinessSubscription is called, then it dispatches SET_SEATS_FOR_BUSINESS_SUBSCRIPTION with the given seat count', () => {
    const { result } = renderHook(() => useCheckout(dispatch));
    result.current.setSeatsForBusinessSubscription(5);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SEATS_FOR_BUSINESS_SUBSCRIPTION', payload: 5 });
  });

  it('When setIsUpdateSubscriptionDialogOpen is called, then it dispatches SET_IS_UPDATE_SUBSCRIPTION_DIALOG_OPEN with the boolean value', () => {
    const { result } = renderHook(() => useCheckout(dispatch));
    result.current.setIsUpdateSubscriptionDialogOpen(true);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_IS_UPDATE_SUBSCRIPTION_DIALOG_OPEN', payload: true });
  });

  it('When setIsUpdatingSubscription is called, then it dispatches SET_IS_UPDATING_SUBSCRIPTION with the boolean value', () => {
    const { result } = renderHook(() => useCheckout(dispatch));
    result.current.setIsUpdatingSubscription(true);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_IS_UPDATING_SUBSCRIPTION', payload: true });
  });

  it('When called with same dispatch, callbacks are memoized', () => {
    const { result, rerender } = renderHook(() => useCheckout(dispatch));
    const firstSetAuthMethod = result.current.setAuthMethod;
    rerender();
    expect(result.current.setAuthMethod).toBe(firstSetAuthMethod);
  });
});
