import { DisplayPrice } from '@internxt/sdk/dist/drive/payments/types/types';
import { AuthMethodTypes } from '../types';

export interface State {
  isPaying: boolean;
  isUpdateSubscriptionDialogOpen: boolean;
  isUpdatingSubscription: boolean;
  prices: DisplayPrice[];
  seatsForBusinessSubscription: number;
  authMethod: AuthMethodTypes;
}

export type Action =
  | { type: 'SET_IS_PAYING'; payload: boolean }
  | { type: 'SET_IS_UPDATE_SUBSCRIPTION_DIALOG_OPEN'; payload: boolean }
  | { type: 'SET_IS_UPDATING_SUBSCRIPTION'; payload: boolean }
  | { type: 'SET_PRICES'; payload: DisplayPrice[] }
  | { type: 'SET_SEATS_FOR_BUSINESS_SUBSCRIPTION'; payload: number }
  | { type: 'SET_AUTH_METHOD'; payload: AuthMethodTypes };
