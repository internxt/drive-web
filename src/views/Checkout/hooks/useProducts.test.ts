import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProducts } from './useProducts';
import { checkoutService } from '../services';
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial state', () => {
    test('When the hook is initialized without a plan Id, then nothing happens', () => {
      const props = {
        planId: null,
        promotionCode: undefined,
        currency: 'eur',
        translate: mockTranslate,
      };
      const getPriceByIdSpy = vi.spyOn(checkoutService, 'getPriceById');

      renderHook(() => useProducts(props));

      expect(getPriceByIdSpy).not.toHaveBeenCalled();
    });

    test('When the hook is initialized with a plan Id, then the selected plan is fetched', async () => {
      const priceByIdSpy = vi.spyOn(checkoutService, 'getPriceById').mockResolvedValue(mockPriceWithTax);
      const props = {
        planId: 'price_123',
        promotionCode: undefined,
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
      });
    });
  });

  describe('Fetching the selected plan', () => {
    test('When fetching a plan, then the fetched data is saved', async () => {
      vi.spyOn(checkoutService, 'getPriceById').mockResolvedValue(mockPriceWithTax);
      const props = {
        planId: null,
        promotionCode: undefined,
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
        promotionCode: undefined,
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
        promotionCode: undefined,
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
        promotionCode: undefined,
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

  describe('Hook return values', () => {
    test('When the hook is initialized, then it should return the expected values', () => {
      const props = {
        planId: null,
        promotionCode: undefined,
        currency: 'eur',
        translate: mockTranslate,
      };

      const { result } = renderHook(() => useProducts(props));

      expect(result.current).toHaveProperty('selectedPlan');
      expect(result.current).toHaveProperty('businessSeats');
      expect(result.current).toHaveProperty('fetchSelectedPlan');
      expect(typeof result.current.fetchSelectedPlan).toBe('function');
    });
  });
});
