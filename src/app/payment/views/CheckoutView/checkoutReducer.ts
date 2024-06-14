import { Stripe, StripeElementsOptions } from '@stripe/stripe-js';
import { CouponCodeData, SelectedPlanData } from './types';

interface State {
  selectedPlan: SelectedPlanData | null;
  promoCode?: string;
  couponCodeData?: CouponCodeData;
  isLoading: boolean;
  stripe: Stripe | null;
  elementsOptions?: StripeElementsOptions;
}

type Action =
  | { type: 'SET_SELECTED_PLAN'; payload: SelectedPlanData }
  | { type: 'SET_PROMO_CODE'; payload: string }
  | { type: 'SET_COUPON_CODE_DATA'; payload: CouponCodeData }
  | { type: 'SET_IS_LOADING'; payload: boolean }
  | { type: 'SET_STRIPE'; payload: Stripe | null }
  | { type: 'SET_ELEMENTS_OPTIONS'; payload: StripeElementsOptions };

export const initialState: State = {
  selectedPlan: null,
  promoCode: '',
  couponCodeData: undefined,
  isLoading: false,
  stripe: null,
  elementsOptions: undefined,
};

export const checkoutReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_SELECTED_PLAN':
      return { ...state, selectedPlan: action.payload };
    case 'SET_PROMO_CODE':
      return { ...state, promoCode: action.payload };
    case 'SET_COUPON_CODE_DATA':
      return { ...state, couponCodeData: action.payload };
    case 'SET_IS_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_STRIPE':
      return { ...state, stripe: action.payload };
    case 'SET_ELEMENTS_OPTIONS':
      return { ...state, elementsOptions: action.payload };
    default:
      return state;
  }
};
