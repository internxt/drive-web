import { describe, it, expect } from 'vitest';
import { checkoutReducer, initialStateForCheckout } from './checkoutReducer';
import { State } from './types';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { DisplayPrice, UserType } from '@internxt/sdk/dist/drive/payments/types/types';
import { CouponCodeData, PartialErrorState } from '../types';
import { StripeElementsOptions } from '@stripe/stripe-js';

describe('checkoutReducer', () => {
  const createMockPlan = (id: string, currency: string, amount: number, type: UserType): PriceWithTax => ({
    price: {
      id,
      currency,
      amount,
      bytes: 107374182400,
      interval: 'month',
      decimalAmount: 9.99,
      type,
      product: `prod_${id}`,
    },
    taxes: { tax: 0, decimalTax: 0, amountWithTax: amount, decimalAmountWithTax: 9.99 },
  });

  describe('initialStateForCheckout', () => {
    it('provides default checkout state', () => {
      expect(initialStateForCheckout.plan).toBeNull();
      expect(initialStateForCheckout.isPaying).toBe(false);
      expect(initialStateForCheckout.authMethod).toBe('signUp');
      expect(initialStateForCheckout.seatsForBusinessSubscription).toBe(1);
    });
  });

  describe('SET_PLAN', () => {
    it('updates selected plan', () => {
      const mockPlan = createMockPlan('123', 'usd', 999, UserType.Individual);
      const result = checkoutReducer(initialStateForCheckout, { type: 'SET_PLAN', payload: mockPlan });

      expect(result.plan).toEqual(mockPlan);
      expect(result).not.toBe(initialStateForCheckout);
    });
  });

  describe('SET_CURRENT_PLAN_SELECTED', () => {
    it('updates currently viewing plan', () => {
      const mockPlan = createMockPlan('456', 'eur', 1999, UserType.Business);
      const result = checkoutReducer(initialStateForCheckout, { type: 'SET_CURRENT_PLAN_SELECTED', payload: mockPlan });

      expect(result.currentSelectedPlan).toEqual(mockPlan);
    });
  });

  describe('SET_AVATAR_BLOB', () => {
    it('stores user avatar image', () => {
      const mockBlob = new Blob(['avatar'], { type: 'image/png' });
      const result = checkoutReducer(initialStateForCheckout, { type: 'SET_AVATAR_BLOB', payload: mockBlob });
      expect(result.avatarBlob).toBe(mockBlob);
    });
  });

  describe('boolean state setters', () => {
    it('tracks payment processing status', () => {
      const result = checkoutReducer(initialStateForCheckout, { type: 'SET_IS_PAYING', payload: true });
      expect(result.isPaying).toBe(true);
    });

    it('marks checkout as ready to display', () => {
      const result = checkoutReducer(initialStateForCheckout, {
        type: 'SET_IS_CHECKOUT_READY_TO_RENDER',
        payload: true,
      });
      expect(result.isCheckoutReadyToRender).toBe(true);
    });

    it('controls subscription update dialog visibility', () => {
      const result = checkoutReducer(initialStateForCheckout, {
        type: 'SET_IS_UPDATE_SUBSCRIPTION_DIALOG_OPEN',
        payload: true,
      });
      expect(result.isUpdateSubscriptionDialogOpen).toBe(true);
    });

    it('tracks subscription update progress', () => {
      const result = checkoutReducer(initialStateForCheckout, { type: 'SET_IS_UPDATING_SUBSCRIPTION', payload: true });
      expect(result.isUpdatingSubscription).toBe(true);
    });
  });

  describe('SET_COUNTRY', () => {
    it('stores billing country', () => {
      const result = checkoutReducer(initialStateForCheckout, { type: 'SET_COUNTRY', payload: 'US' });
      expect(result.country).toBe('US');
    });
  });

  describe('SET_PRICES', () => {
    it('updates available pricing options', () => {
      const mockPrices: DisplayPrice[] = [
        {
          id: 'price_1',
          currency: 'usd',
          amount: 999,
          bytes: 107374182400,
          interval: 'month',
          userType: UserType.Individual,
        },
        {
          id: 'price_2',
          currency: 'usd',
          amount: 1999,
          bytes: 214748364800,
          interval: 'year',
          userType: UserType.Individual,
        },
      ];
      const result = checkoutReducer(initialStateForCheckout, { type: 'SET_PRICES', payload: mockPrices });
      expect(result.prices).toEqual(mockPrices);
    });
  });

  describe('string state setters', () => {
    it('saves customer name from payment form', () => {
      const result = checkoutReducer(initialStateForCheckout, {
        type: 'SET_USER_NAME_FROM_ADDRESS_ELEMENT',
        payload: 'John Doe',
      });
      expect(result.userNameFromAddressElement).toBe('John Doe');
    });

    it('applies promotional code', () => {
      const result = checkoutReducer(initialStateForCheckout, { type: 'SET_PROMO_CODE_NAME', payload: 'SUMMER2024' });
      expect(result.promoCodeName).toBe('SUMMER2024');
    });
  });

  describe('complex state setters', () => {
    it('stores coupon details', () => {
      const mockCoupon: CouponCodeData = { codeId: 'promo_123', codeName: 'DISCOUNT20', percentOff: 20 };
      const result = checkoutReducer(initialStateForCheckout, { type: 'SET_COUPON_CODE_DATA', payload: mockCoupon });
      expect(result.couponCodeData).toEqual(mockCoupon);
    });

    it('configures Stripe payment elements', () => {
      const mockOptions: StripeElementsOptions = { mode: 'payment', amount: 999, currency: 'usd' };
      const result = checkoutReducer(initialStateForCheckout, { type: 'SET_ELEMENTS_OPTIONS', payload: mockOptions });
      expect(result.elementsOptions).toEqual(mockOptions);
    });

    it('switches between signup and login', () => {
      const result = checkoutReducer(initialStateForCheckout, { type: 'SET_AUTH_METHOD', payload: 'signIn' });
      expect(result.authMethod).toBe('signIn');
    });

    it('captures checkout error state', () => {
      const mockError: PartialErrorState = { stripe: 'Payment failed', auth: 'Authentication error' };
      const result = checkoutReducer(initialStateForCheckout, { type: 'SET_ERROR', payload: mockError });
      expect(result.error).toEqual(mockError);
    });

    it('adjusts business plan seats', () => {
      const result = checkoutReducer(initialStateForCheckout, {
        type: 'SET_SEATS_FOR_BUSINESS_SUBSCRIPTION',
        payload: 5,
      });
      expect(result.seatsForBusinessSubscription).toBe(5);
    });
  });

  describe('edge cases', () => {
    it('returns unchanged state for unknown actions', () => {
      expect(checkoutReducer(initialStateForCheckout, {} as never)).toBe(initialStateForCheckout);
    });

    it('creates new state object on every action', () => {
      const customState: State = { ...initialStateForCheckout, country: 'FR', isPaying: true };
      const result = checkoutReducer(customState, { type: 'SET_COUNTRY', payload: 'US' });

      expect(result).not.toBe(customState);
      expect(customState.country).toBe('FR');
      expect(result.country).toBe('US');
      expect(result.isPaying).toBe(true);
    });
  });
});
