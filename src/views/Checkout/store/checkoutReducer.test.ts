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

  it('starts with the correct initial values', () => {
    expect(initialStateForCheckout.plan).toBeNull();
    expect(initialStateForCheckout.isPaying).toBe(false);
    expect(initialStateForCheckout.authMethod).toBe('signUp');
    expect(initialStateForCheckout.seatsForBusinessSubscription).toBe(1);
  });

  it('changes selected plans without affecting other information', () => {
    const customState: State = { ...initialStateForCheckout, country: 'FR', isPaying: true };
    const mockPlan = createMockPlan('123', 'usd', 999, UserType.Individual);

    const setPlanResult = checkoutReducer(customState, { type: 'SET_PLAN', payload: mockPlan });
    expect(setPlanResult.plan).toEqual(mockPlan);
    expect(setPlanResult.country).toBe('FR');
    expect(setPlanResult.isPaying).toBe(true);
    expect(setPlanResult).not.toBe(customState);

    const setCurrentPlanResult = checkoutReducer(
      { ...initialStateForCheckout, promoCodeName: 'PROMO123', seatsForBusinessSubscription: 5 },
      { type: 'SET_CURRENT_PLAN_SELECTED', payload: mockPlan },
    );
    expect(setCurrentPlanResult.currentSelectedPlan).toEqual(mockPlan);
    expect(setCurrentPlanResult.promoCodeName).toBe('PROMO123');
    expect(setCurrentPlanResult.seatsForBusinessSubscription).toBe(5);
  });

  it('updates user avatar, country, and prices without losing other data', () => {
    const mockBlob = new Blob(['avatar'], { type: 'image/png' });
    const avatarResult = checkoutReducer(
      { ...initialStateForCheckout, authMethod: 'signIn', isCheckoutReadyToRender: true },
      { type: 'SET_AVATAR_BLOB', payload: mockBlob },
    );
    expect(avatarResult.avatarBlob).toBe(mockBlob);
    expect(avatarResult.authMethod).toBe('signIn');
    expect(avatarResult.isCheckoutReadyToRender).toBe(true);

    const countryResult = checkoutReducer(
      { ...initialStateForCheckout, isPaying: false, authMethod: 'signIn' },
      { type: 'SET_COUNTRY', payload: 'US' },
    );
    expect(countryResult.country).toBe('US');
    expect(countryResult.isPaying).toBe(false);
    expect(countryResult.authMethod).toBe('signIn');

    const mockPrices: DisplayPrice[] = [
      {
        id: 'price_1',
        currency: 'usd',
        amount: 999,
        bytes: 107374182400,
        interval: 'month',
        userType: UserType.Individual,
      },
    ];
    const pricesResult = checkoutReducer(
      { ...initialStateForCheckout, country: 'GB', seatsForBusinessSubscription: 3 },
      { type: 'SET_PRICES', payload: mockPrices },
    );
    expect(pricesResult.prices).toEqual(mockPrices);
    expect(pricesResult.country).toBe('GB');
    expect(pricesResult.seatsForBusinessSubscription).toBe(3);
  });

  it('tracks payment and loading status without erasing existing information', () => {
    const payingResult = checkoutReducer(
      { ...initialStateForCheckout, country: 'ES', promoCodeName: 'EXISTING' },
      { type: 'SET_IS_PAYING', payload: true },
    );
    expect(payingResult.isPaying).toBe(true);
    expect(payingResult.country).toBe('ES');
    expect(payingResult.promoCodeName).toBe('EXISTING');

    const readyResult = checkoutReducer(
      { ...initialStateForCheckout, isPaying: true, promoCodeName: 'WELCOME' },
      { type: 'SET_IS_CHECKOUT_READY_TO_RENDER', payload: true },
    );
    expect(readyResult.isCheckoutReadyToRender).toBe(true);
    expect(readyResult.isPaying).toBe(true);
    expect(readyResult.promoCodeName).toBe('WELCOME');

    const dialogResult = checkoutReducer(
      { ...initialStateForCheckout, isUpdatingSubscription: true, seatsForBusinessSubscription: 10 },
      { type: 'SET_IS_UPDATE_SUBSCRIPTION_DIALOG_OPEN', payload: true },
    );
    expect(dialogResult.isUpdateSubscriptionDialogOpen).toBe(true);
    expect(dialogResult.isUpdatingSubscription).toBe(true);
    expect(dialogResult.seatsForBusinessSubscription).toBe(10);

    const updatingResult = checkoutReducer(
      { ...initialStateForCheckout, isUpdateSubscriptionDialogOpen: true, country: 'DE' },
      { type: 'SET_IS_UPDATING_SUBSCRIPTION', payload: true },
    );
    expect(updatingResult.isUpdatingSubscription).toBe(true);
    expect(updatingResult.isUpdateSubscriptionDialogOpen).toBe(true);
    expect(updatingResult.country).toBe('DE');
  });

  it('saves promo codes while keeping everything else intact', () => {
    const promoCodeResult = checkoutReducer(
      { ...initialStateForCheckout, isPaying: true, seatsForBusinessSubscription: 7 },
      { type: 'SET_PROMO_CODE_NAME', payload: 'SUMMER2024' },
    );
    expect(promoCodeResult.promoCodeName).toBe('SUMMER2024');
    expect(promoCodeResult.isPaying).toBe(true);
    expect(promoCodeResult.seatsForBusinessSubscription).toBe(7);
  });

  it('handles coupons, payment settings, login method, errors, and seats without losing other details', () => {
    const mockCoupon: CouponCodeData = { codeId: 'promo_123', codeName: 'DISCOUNT20', percentOff: 20 };
    const couponResult = checkoutReducer(
      { ...initialStateForCheckout, promoCodeName: 'EXISTING', country: 'CA' },
      { type: 'SET_COUPON_CODE_DATA', payload: mockCoupon },
    );
    expect(couponResult.couponCodeData).toEqual(mockCoupon);
    expect(couponResult.promoCodeName).toBe('EXISTING');
    expect(couponResult.country).toBe('CA');

    const mockOptions: StripeElementsOptions = { mode: 'payment', amount: 999, currency: 'usd' };
    const elementsResult = checkoutReducer(
      { ...initialStateForCheckout, isPaying: false, authMethod: 'signIn' },
      { type: 'SET_ELEMENTS_OPTIONS', payload: mockOptions },
    );
    expect(elementsResult.elementsOptions).toEqual(mockOptions);
    expect(elementsResult.isPaying).toBe(false);
    expect(elementsResult.authMethod).toBe('signIn');

    const authResult = checkoutReducer(
      { ...initialStateForCheckout, isCheckoutReadyToRender: true, promoCodeName: 'SPECIAL' },
      { type: 'SET_AUTH_METHOD', payload: 'signIn' },
    );
    expect(authResult.authMethod).toBe('signIn');
    expect(authResult.isCheckoutReadyToRender).toBe(true);
    expect(authResult.promoCodeName).toBe('SPECIAL');

    const mockError: PartialErrorState = { stripe: 'Payment failed', auth: 'Authentication error' };
    const errorResult = checkoutReducer(
      { ...initialStateForCheckout, isPaying: true, country: 'MX' },
      { type: 'SET_ERROR', payload: mockError },
    );
    expect(errorResult.error).toEqual(mockError);
    expect(errorResult.isPaying).toBe(true);
    expect(errorResult.country).toBe('MX');

    const seatsResult = checkoutReducer(
      { ...initialStateForCheckout, promoCodeName: 'BUSINESS', isUpdatingSubscription: true },
      { type: 'SET_SEATS_FOR_BUSINESS_SUBSCRIPTION', payload: 5 },
    );
    expect(seatsResult.seatsForBusinessSubscription).toBe(5);
    expect(seatsResult.promoCodeName).toBe('BUSINESS');
    expect(seatsResult.isUpdatingSubscription).toBe(true);
  });

  it('ignores unknown actions and creates new copies when making changes', () => {
    expect(checkoutReducer(initialStateForCheckout, {} as never)).toBe(initialStateForCheckout);

    const customState: State = { ...initialStateForCheckout, country: 'FR', isPaying: true };
    const result = checkoutReducer(customState, { type: 'SET_COUNTRY', payload: 'US' });
    expect(result).not.toBe(customState);
    expect(customState.country).toBe('FR');
    expect(result.country).toBe('US');
    expect(result.isPaying).toBe(true);
  });
});
