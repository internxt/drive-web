import { Dispatch, useCallback } from 'react';
import { Action } from '../store';
import { AuthMethodTypes } from '../types';

export const useCheckout = (dispatchReducer: Dispatch<Action>) => {
  const setAuthMethod = useCallback(
    (method: AuthMethodTypes) => {
      dispatchReducer({ type: 'SET_AUTH_METHOD', payload: method });
    },
    [dispatchReducer],
  );

  const setIsUserPaying = useCallback(
    (isPaying: boolean) => {
      dispatchReducer({ type: 'SET_IS_PAYING', payload: isPaying });
    },
    [dispatchReducer],
  );

  const setSeatsForBusinessSubscription = useCallback(
    (seats: number) => {
      dispatchReducer({ type: 'SET_SEATS_FOR_BUSINESS_SUBSCRIPTION', payload: seats });
    },
    [dispatchReducer],
  );

  const setIsUpdateSubscriptionDialogOpen = useCallback(
    (isOpen: boolean) => {
      dispatchReducer({ type: 'SET_IS_UPDATE_SUBSCRIPTION_DIALOG_OPEN', payload: isOpen });
    },
    [dispatchReducer],
  );

  const setIsUpdatingSubscription = useCallback(
    (isUpdating: boolean) => {
      dispatchReducer({ type: 'SET_IS_UPDATING_SUBSCRIPTION', payload: isUpdating });
    },
    [dispatchReducer],
  );

  return {
    setAuthMethod,
    setIsUserPaying,
    setSeatsForBusinessSubscription,
    setIsUpdateSubscriptionDialogOpen,
    setIsUpdatingSubscription,
  };
};
