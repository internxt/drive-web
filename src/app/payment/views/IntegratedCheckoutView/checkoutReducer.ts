import { Action, State } from '../../../payment/types';

export const initialStateForCheckout: State = {
  selectedPlan: null,
  promoCode: '',
  couponCodeData: undefined,
  stripe: null,
  elementsOptions: undefined,
  error: undefined,
  authMethod: 'signUp',
};

export const checkoutReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_SELECTED_PLAN':
      return { ...state, selectedPlan: action.payload };
    case 'SET_PROMO_CODE_NAME':
      return { ...state, promoCode: action.payload };
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
