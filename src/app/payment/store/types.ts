import { DisplayPrice } from '@internxt/sdk/dist/drive/payments/types';
import { AuthMethodTypes, CouponCodeData, PartialErrorState, PlanData, RequestedPlanData } from '../types';
import { StripeElementsOptions } from '@stripe/stripe-js';

export interface State {
  plan: PlanData | null;
  currentSelectedPlan: RequestedPlanData | null;
  avatarBlob: Blob | null;
  isPaying: boolean;
  isUpsellSwitchActivated: boolean;
  isCheckoutReadyToRender: boolean;
  isUpdateSubscriptionDialogOpen: boolean;
  isUpdatingSubscription: boolean;
  prices: DisplayPrice[];
  country: string;
  userNameFromAddressElement: string;
  seatsForBusinessSubscription: number;
  authMethod: AuthMethodTypes;
  promoCodeName?: string;
  couponCodeData?: CouponCodeData;
  elementsOptions?: StripeElementsOptions;
  error?: PartialErrorState;
}

export type Action =
  | { type: 'SET_PLAN'; payload: PlanData }
  | { type: 'SET_CURRENT_PLAN_SELECTED'; payload: RequestedPlanData }
  | { type: 'SET_AVATAR_BLOB'; payload: Blob | null }
  | { type: 'SET_IS_PAYING'; payload: boolean }
  | { type: 'SET_IS_UPSELL_SWITCH_ACTIVATED'; payload: boolean }
  | { type: 'SET_IS_CHECKOUT_READY_TO_RENDER'; payload: boolean }
  | { type: 'SET_IS_UPDATE_SUBSCRIPTION_DIALOG_OPEN'; payload: boolean }
  | { type: 'SET_IS_UPDATING_SUBSCRIPTION'; payload: boolean }
  | { type: 'SET_PRICES'; payload: DisplayPrice[] }
  | { type: 'SET_COUNTRY'; payload: string }
  | { type: 'SET_SEATS_FOR_BUSINESS_SUBSCRIPTION'; payload: number }
  | { type: 'SET_USER_NAME_FROM_ADDRESS_ELEMENT'; payload: string }
  | { type: 'SET_PROMO_CODE_NAME'; payload: string | undefined }
  | { type: 'SET_COUPON_CODE_DATA'; payload: CouponCodeData | undefined }
  | { type: 'SET_ELEMENTS_OPTIONS'; payload: StripeElementsOptions }
  | { type: 'SET_AUTH_METHOD'; payload: AuthMethodTypes }
  | { type: 'SET_ERROR'; payload: PartialErrorState };
