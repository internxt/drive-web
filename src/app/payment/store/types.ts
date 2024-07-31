import { AuthMethodTypes, CouponCodeData, CurrentPlanSelected, PartialErrorState, PlanData } from '../types';
import { Stripe, StripeElementsOptions } from '@stripe/stripe-js';

export interface State {
  plan: PlanData | null;
  currentPlanSelected: CurrentPlanSelected | null;
  stripe: Stripe | null;
  authMethod: AuthMethodTypes;
  promoCodeName?: string;
  couponCodeData?: CouponCodeData;
  elementsOptions?: StripeElementsOptions;
  error?: PartialErrorState;
}

export type Action =
  | { type: 'SET_PLAN'; payload: PlanData }
  | { type: 'SET_CURRENT_PLAN_SELECTED'; payload: CurrentPlanSelected }
  | { type: 'SET_PROMO_CODE_NAME'; payload: string }
  | { type: 'SET_COUPON_CODE_DATA'; payload: CouponCodeData }
  | { type: 'SET_STRIPE'; payload: Stripe | null }
  | { type: 'SET_ELEMENTS_OPTIONS'; payload: StripeElementsOptions }
  | { type: 'SET_AUTH_METHOD'; payload: AuthMethodTypes }
  | { type: 'SET_ERROR'; payload: PartialErrorState };
