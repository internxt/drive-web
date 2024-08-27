import { AuthMethodTypes, CouponCodeData, CurrentPlanSelected, PartialErrorState, PlanData } from '../types';
import { StripeElementsOptions } from '@stripe/stripe-js';

export interface State {
  plan: PlanData | null;
  currentSelectedPlan: CurrentPlanSelected | null;
  avatarBlob: Blob | null;
  isPaying: boolean;
  userNameFromAddressElement: string;
  users: number;
  authMethod: AuthMethodTypes;
  promoCodeName?: string;
  couponCodeData?: CouponCodeData;
  elementsOptions?: StripeElementsOptions;
  error?: PartialErrorState;
}

export type Action =
  | { type: 'SET_PLAN'; payload: PlanData }
  | { type: 'SET_CURRENT_PLAN_SELECTED'; payload: CurrentPlanSelected }
  | { type: 'SET_AVATAR_BLOB'; payload: Blob | null }
  | { type: 'SET_IS_PAYING'; payload: boolean }
  | { type: 'SET_USERS'; payload: number }
  | { type: 'SET_USER_NAME_FROM_ADDRESS_ELEMENT'; payload: string }
  | { type: 'SET_PROMO_CODE_NAME'; payload: string | undefined }
  | { type: 'SET_COUPON_CODE_DATA'; payload: CouponCodeData | undefined }
  | { type: 'SET_ELEMENTS_OPTIONS'; payload: StripeElementsOptions }
  | { type: 'SET_AUTH_METHOD'; payload: AuthMethodTypes }
  | { type: 'SET_ERROR'; payload: PartialErrorState };
