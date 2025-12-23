import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProducts } from './useProducts';
import { checkoutService } from '../services';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { UserType } from '@internxt/sdk/dist/drive/payments/types/types';

describe('Products custom hook', () => {
  const mockTranslate = vi.fn((key: string) => key);

  const mockPriceWithTax: PriceWithTax = {
    price: {
      id: 'price_123',
      bytes: 1099511627776,
      decimalAmount: 10,
      product: 'prod_1234',
      currency: 'eur',
      amount: 10,
      interval: 'year',
      type: UserType.Individual,
      minimumSeats: undefined,
    },
    taxes: {
      amountWithTax: 1210,
      decimalTax: 12.1,
      tax: 210,
      decimalAmountWithTax: 12.1,
    },
  };

  const mockPromoCodeData = {
    codeId: 'promo_123',
    amountOff: undefined,
    percentOff: 20,
    codeName: 'DISCOUNT20',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial state', () => {
    test('When the hook is initialized without a plan Id, then nothing happens', () => {
      const props = {
        planId: null,
        promotionCode: null,
        currency: 'eur',
        translate: mockTranslate,
      };
      const getPriceByIdSpy = vi.spyOn(checkoutService, 'getPriceById');
      const fetchPromoCodeSpy = vi.spyOn(checkoutService, 'fetchPromotionCodeByName');

      renderHook(() => useProducts(props));

      expect(getPriceByIdSpy).not.toHaveBeenCalled();
      expect(fetchPromoCodeSpy).not.toHaveBeenCalled();
    });

    test('When the hook is initialized with a plan Id, then the selected plan is fetched', async () => {
      const priceByIdSpy = vi.spyOn(checkoutService, 'getPriceById').mockResolvedValue(mockPriceWithTax);
      const props = {
        planId: 'price_123',
        promotionCode: null,
        currency: 'eur',
        userAddress: '1.1.1.1',
        translate: mockTranslate,
      };

      renderHook(() => useProducts(props));

      await waitFor(() => {
        expect(priceByIdSpy).toHaveBeenCalledWith({
          priceId: 'price_123',
          userAddress: '1.1.1.1',
          currency: 'eur',
          promoCodeName: undefined,
          postalCode: undefined,
          country: undefined,
        });
      });
    });

    test('When the hook is initialized with plan Id and promotional code, then we fetch the plan and the promotional code', async () => {
      const getPriceByIdSpy = vi.spyOn(checkoutService, 'getPriceById').mockResolvedValue(mockPriceWithTax);
      const fetchPromoCodeSpy = vi
        .spyOn(checkoutService, 'fetchPromotionCodeByName')
        .mockResolvedValue(mockPromoCodeData);

      const props = {
        planId: 'price_123',
        promotionCode: 'SUMMER20',
        currency: 'eur',
        userAddress: '1.1.1.1',
        translate: mockTranslate,
      };

      renderHook(() => useProducts(props));

      await waitFor(() => {
        expect(getPriceByIdSpy).toHaveBeenCalled();
        expect(fetchPromoCodeSpy).toHaveBeenCalledWith('price_123', 'SUMMER20');
      });
    });
  });

  describe('Fetching the selected plan', () => {
    test('When fetching a plan, then the fetched data is saved', async () => {
      vi.spyOn(checkoutService, 'getPriceById').mockResolvedValue(mockPriceWithTax);
      const props = {
        planId: null,
        promotionCode: null,
        currency: 'eur',
        translate: mockTranslate,
      };

      const { result } = renderHook(() => useProducts(props));

      await act(async () => {
        await result.current.fetchSelectedPlan({ priceId: 'price_123', currency: 'eur' });
      });

      expect(result.current.selectedPlan).toEqual(mockPriceWithTax);
    });

    test('When fetching a plan using the mobile token, then the amount is set to 0', async () => {
      vi.spyOn(checkoutService, 'getPriceById').mockResolvedValue(mockPriceWithTax);
      const props = {
        planId: null,
        promotionCode: null,
        currency: 'eur',
        translate: mockTranslate,
      };

      const { result } = renderHook(() => useProducts(props));

      await act(async () => {
        await result.current.fetchSelectedPlan({ priceId: 'price_123', currency: 'eur', mobileToken: 'mobile_token' });
      });

      expect(result.current.selectedPlan?.amount).toBe(0);
      expect(result.current.selectedPlan?.decimalAmount).toBe(0);
    });

    test('When fetching a plan returns a plan with seats, then the they are updated', async () => {
      const planWithMinimumSeats = {
        ...mockPriceWithTax,
        price: {
          ...mockPriceWithTax.price,
          minimumSeats: 5,
        },
      };
      vi.spyOn(checkoutService, 'getPriceById').mockResolvedValue(planWithMinimumSeats);
      const props = {
        planId: null,
        promotionCode: null,
        currency: 'eur',
        translate: mockTranslate,
      };

      const { result } = renderHook(() => useProducts(props));

      await act(async () => {
        await result.current.fetchSelectedPlan({ priceId: 'price_business', currency: 'eur' });
      });

      expect(result.current.businessSeats).toBe(5);
    });

    test('When fetching a plan without currency, then eur is used as default', async () => {
      vi.spyOn(checkoutService, 'getPriceById').mockResolvedValue(mockPriceWithTax);
      const props = {
        planId: null,
        promotionCode: null,
        translate: mockTranslate,
      };

      const { result } = renderHook(() => useProducts(props));

      await act(async () => {
        await result.current.fetchSelectedPlan({ priceId: 'price_123' });
      });

      expect(checkoutService.getPriceById).toHaveBeenCalledWith(
        expect.objectContaining({
          currency: 'eur',
        }),
      );
    });
  });

  describe('Fetching a promotional code', () => {
    test('When fetching a promotional code, then promo code data is saved', async () => {
      vi.spyOn(checkoutService, 'fetchPromotionCodeByName').mockResolvedValue(mockPromoCodeData);
      const props = {
        planId: null,
        promotionCode: null,
        currency: 'eur',
        translate: mockTranslate,
      };

      const { result } = renderHook(() => useProducts(props));

      await act(async () => {
        await result.current.fetchPromotionCode({ priceId: 'price_123', promotionCode: 'DISCOUNT10' });
      });

      expect(result.current.promoCodeData).toEqual({
        codeId: 'promo_123',
        codeName: 'DISCOUNT10',
        amountOff: undefined,
        percentOff: 20,
      });
    });
  });

  describe('Removing coupon code data', () => {
    test('When removing coupon code, then promotional code is removed', async () => {
      vi.spyOn(checkoutService, 'fetchPromotionCodeByName').mockResolvedValue(mockPromoCodeData);
      const props = {
        planId: null,
        promotionCode: null,
        currency: 'eur',
        translate: mockTranslate,
      };

      const { result } = renderHook(() => useProducts(props));

      await act(async () => {
        await result.current.fetchPromotionCode({ priceId: 'price_123', promotionCode: 'DISCOUNT10' });
      });

      act(() => {
        result.current.removeCouponCode();
      });

      expect(result.current.promoCodeData).toBeUndefined();
      expect(result.current.couponError).toBeNull();
    });
  });

  describe('On promo code error', () => {
    test('When promo code is not found, then an error indicating so is thrown', () => {
      const props = {
        planId: null,
        promotionCode: null,
        currency: 'eur',
        translate: mockTranslate,
      };
      const { result } = renderHook(() => useProducts(props));
      const error = Object.assign(new Error('Promo code not found'), { status: 404 });

      act(() => {
        result.current.onPromoCodeError(error);
      });

      expect(result.current.couponError).toBe('Promo code not found');
      expect(result.current.promoCodeData).toBeUndefined();
    });

    test('When there is a bad request while fetching the coupon code, then an error indicating so is thrown', () => {
      const props = {
        planId: null,
        promotionCode: null,
        currency: 'eur',
        translate: mockTranslate,
      };
      const { result } = renderHook(() => useProducts(props));
      const error = Object.assign(new Error('Invalid request'), { status: 400 });

      act(() => {
        result.current.onPromoCodeError(error);
      });

      expect(result.current.couponError).toBe('Invalid request');
    });

    test('When it is a random error, then a general error indicating so is thrown', () => {
      const props = {
        planId: null,
        promotionCode: null,
        currency: 'eur',
        translate: mockTranslate,
      };
      const { result } = renderHook(() => useProducts(props));
      const error = new Error('Unknown error');

      act(() => {
        result.current.onPromoCodeError(error);
      });

      expect(result.current.couponError).toBe('notificationMessages.errorApplyingCoupon');
    });

    test('When an error occurs and we want to show a notification, then a toast notification is shown', () => {
      const props = {
        planId: null,
        promotionCode: null,
        currency: 'eur',
        translate: mockTranslate,
      };
      const { result } = renderHook(() => useProducts(props));
      const error = new Error('Error applying coupon');
      const notificationsServiceSpy = vi.spyOn(notificationsService, 'show');

      act(() => {
        result.current.onPromoCodeError(error, true);
      });

      expect(notificationsServiceSpy).toHaveBeenCalledWith({
        text: 'notificationMessages.errorApplyingCoupon',
        type: ToastType.Error,
      });
    });
  });

  describe('Hook return values', () => {
    test('When the hook is initialized, then it should return the expected values', () => {
      const props = {
        planId: null,
        promotionCode: null,
        currency: 'eur',
        translate: mockTranslate,
      };

      const { result } = renderHook(() => useProducts(props));

      expect(result.current).toHaveProperty('selectedPlan');
      expect(result.current).toHaveProperty('promoCodeData');
      expect(result.current).toHaveProperty('couponError');
      expect(result.current).toHaveProperty('businessSeats');
      expect(result.current).toHaveProperty('fetchSelectedPlan');
      expect(result.current).toHaveProperty('fetchPromotionCode');
      expect(result.current).toHaveProperty('removeCouponCode');
      expect(result.current).toHaveProperty('onPromoCodeError');
      expect(typeof result.current.fetchSelectedPlan).toBe('function');
      expect(typeof result.current.fetchPromotionCode).toBe('function');
      expect(typeof result.current.removeCouponCode).toBe('function');
      expect(typeof result.current.onPromoCodeError).toBe('function');
    });
  });
});
