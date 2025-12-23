import { Dispatch } from 'react';
import { Action } from '../store';
import { AuthMethodTypes } from '../types';

export const useCheckout = (dispatchReducer: Dispatch<Action>) => {
  const setAuthMethod = (method: AuthMethodTypes) => {
    dispatchReducer({ type: 'SET_AUTH_METHOD', payload: method });
  };

  const setAvatarBlob = (avatarBlob: Blob | null) => {
    dispatchReducer({
      type: 'SET_AVATAR_BLOB',
      payload: avatarBlob ?? null,
    });
  };

  const setSeatsForBusinessSubscription = (seats: number) => {
    dispatchReducer({ type: 'SET_SEATS_FOR_BUSINESS_SUBSCRIPTION', payload: seats });
  };

  const setIsUserPaying = (isPaying: boolean) => {
    dispatchReducer({
      type: 'SET_IS_PAYING',
      payload: isPaying,
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

  return {
    setAuthMethod,
    setAvatarBlob,
    setIsUserPaying,
    setSeatsForBusinessSubscription,
    setIsUpdateSubscriptionDialogOpen,
    setIsUpdatingSubscription,
  };
};
