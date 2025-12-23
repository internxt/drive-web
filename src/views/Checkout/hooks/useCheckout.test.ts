import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCheckout } from './useCheckout';

describe('useCheckout hook actions', () => {
  const dispatch = vi.fn();

  const {
    setAuthMethod,
    setAvatarBlob,
    setIsUserPaying,
    setSeatsForBusinessSubscription,
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

  it('When setAvatarBlob is called, then it dispatches SET_AVATAR_BLOB with the provided Blob or null', () => {
    setAvatarBlob(null);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_AVATAR_BLOB', payload: null });
  });

  it('When setIsUserPaying is called, then it dispatches SET_IS_PAYING with the boolean value', () => {
    setIsUserPaying(true);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_IS_PAYING', payload: true });
  });

  it('When setSeatsForBusinessSubscription is called, then it dispatches SET_SEATS_FOR_BUSINESS_SUBSCRIPTION with the given seat count', () => {
    setSeatsForBusinessSubscription(5);
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SEATS_FOR_BUSINESS_SUBSCRIPTION', payload: 5 });
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
