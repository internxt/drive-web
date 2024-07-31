import { Action, State } from './types';

export const initialStateForCheckout: State = {
  plan: null,
  currentPlanSelected: null,
  promoCodeName: '',
  couponCodeData: undefined,
  stripe: null,
  elementsOptions: undefined,
  error: undefined,
  authMethod: 'signUp',
};

export const checkoutReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_PLAN':
      return { ...state, plan: action.payload };
    case 'SET_CURRENT_PLAN_SELECTED':
      return { ...state, currentPlanSelected: action.payload };
    case 'SET_PROMO_CODE_NAME':
      return { ...state, promoCodeName: action.payload };
    case 'SET_COUPON_CODE_DATA':
      return { ...state, couponCodeData: action.payload };
    case 'SET_STRIPE':
      return { ...state, stripe: action.payload };
    case 'SET_ELEMENTS_OPTIONS':
      return { ...state, elementsOptions: action.payload };
    case 'SET_AUTH_METHOD':
      return { ...state, authMethod: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
};
