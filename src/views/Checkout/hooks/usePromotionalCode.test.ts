import { renderHook, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { beforeEach, describe, test, expect, vi } from 'vitest';
import { usePromotionalCode } from './usePromotionalCode';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { checkoutService } from '../services';

vi.mock('app/i18n/provider/TranslationProvider', () => ({
  useTranslationContext: vi.fn().mockReturnValue({
    translate: vi.fn().mockImplementation((key: string) => key),
  }),
}));

const mockPromoCodeData = {
  codeId: 'promo_123',
  amountOff: undefined,
  percentOff: 20,
  codeName: 'DISCOUNT20',
};

describe('Promotional Codes Custom Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Fetching a promotional code', () => {
    test('When there is an initial promo code name, then it is fetched directly', async () => {
      const initialCouponCode = 'INITIAL_COUPON_CODE';
      vi.spyOn(checkoutService, 'fetchPromotionCodeByName').mockResolvedValue({
        ...mockPromoCodeData,
        codeName: initialCouponCode,
      });
      const props = {
        priceId: 'price_123',
        promoCodeName: initialCouponCode,
      };

      const { result } = renderHook(() => usePromotionalCode(props));

      await waitFor(() => {
        expect(result.current.promoCodeData).toEqual({
          ...mockPromoCodeData,
          codeName: initialCouponCode,
        });
      });
    });

    test('When fetching a promotional code, then promo code data is saved', async () => {
      vi.spyOn(checkoutService, 'fetchPromotionCodeByName').mockResolvedValue(mockPromoCodeData);
      const props = {
        priceId: 'price_123',
        promoCodeName: null,
      };

      const { result } = renderHook(() => usePromotionalCode(props));

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
        priceId: 'price_123',
        promoCodeName: null,
      };

      const { result } = renderHook(() => usePromotionalCode(props));

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
      const props = { priceId: 'price_123', promoCodeName: null };
      const { result } = renderHook(() => usePromotionalCode(props));
      const error = Object.assign(new Error('Promo code not found'), { status: 404 });

      act(() => {
        result.current.onPromoCodeError(error);
      });

      expect(result.current.couponError).toBe('Promo code not found');
      expect(result.current.promoCodeData).toBeUndefined();
    });

    test('When there is a bad request while fetching the coupon code, then an error indicating so is thrown', () => {
      const props = { priceId: 'price_123', promoCodeName: null };
      const { result } = renderHook(() => usePromotionalCode(props));
      const error = Object.assign(new Error('Invalid request'), { status: 400 });

      act(() => {
        result.current.onPromoCodeError(error);
      });

      expect(result.current.couponError).toBe('Invalid request');
    });

    test('When it is a random error, then a general error indicating so is thrown', () => {
      const props = { priceId: 'price_123', promoCodeName: null };
      const { result } = renderHook(() => usePromotionalCode(props));
      const error = new Error('Unknown error');

      act(() => {
        result.current.onPromoCodeError(error);
      });

      expect(result.current.couponError).toBe('notificationMessages.errorApplyingCoupon');
    });

    test('When an error occurs and we want to show a notification, then a toast notification is shown', () => {
      const props = { priceId: 'price_123', promoCodeName: null };
      const { result } = renderHook(() => usePromotionalCode(props));
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
});
