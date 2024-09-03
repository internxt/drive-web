import { Action, State } from './types';

export const initialStateForCheckout: State = {
  plan: null,
  currentSelectedPlan: null,
  promoCodeName: '',
  avatarBlob: null,
  isPaying: false,
  userNameFromAddressElement: 'Internxt User',
  couponCodeData: undefined,
  elementsOptions: undefined,
  error: undefined,
  authMethod: 'signUp',
  seatsForBusinessSubscription: 1,
};

export const checkoutReducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_PLAN':
      return { ...state, plan: action.payload };
    case 'SET_CURRENT_PLAN_SELECTED':
      return { ...state, currentSelectedPlan: action.payload };
    case 'SET_AVATAR_BLOB':
      return { ...state, avatarBlob: action.payload };
    case 'SET_IS_PAYING':
      return { ...state, isPaying: action.payload };
    case 'SET_USER_NAME_FROM_ADDRESS_ELEMENT':
      return { ...state, userNameFromAddressElement: action.payload };
    case 'SET_PROMO_CODE_NAME':
      return { ...state, promoCodeName: action.payload };
    case 'SET_COUPON_CODE_DATA':
      return { ...state, couponCodeData: action.payload };
    case 'SET_ELEMENTS_OPTIONS':
      return { ...state, elementsOptions: action.payload };
    case 'SET_AUTH_METHOD':
      return { ...state, authMethod: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_SEATS_FOR_BUSINESS_SUBSCRIPTION':
      return { ...state, seatsForBusinessSubscription: action.payload };
    default:
      return state;
  }
};
