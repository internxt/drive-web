import { Action, State } from './types';

export const initialStateForCheckout: State = {
  isPaying: false,
  isUpdateSubscriptionDialogOpen: false,
  isUpdatingSubscription: false,
  prices: [],
  authMethod: 'signUp',
  seatsForBusinessSubscription: 1,
};

export const checkoutReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_IS_PAYING':
      return { ...state, isPaying: action.payload };
    case 'SET_IS_UPDATE_SUBSCRIPTION_DIALOG_OPEN':
      return { ...state, isUpdateSubscriptionDialogOpen: action.payload };
    case 'SET_IS_UPDATING_SUBSCRIPTION':
      return { ...state, isUpdatingSubscription: action.payload };
    case 'SET_PRICES':
      return { ...state, prices: action.payload };
    case 'SET_AUTH_METHOD':
      return { ...state, authMethod: action.payload };
    case 'SET_SEATS_FOR_BUSINESS_SUBSCRIPTION':
      return { ...state, seatsForBusinessSubscription: action.payload };
    default:
      return state;
  }
};
