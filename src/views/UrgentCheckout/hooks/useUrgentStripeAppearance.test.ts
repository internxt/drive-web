import { UserType } from '@internxt/sdk/dist/drive/payments/types/types';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { StripeElementsOptionsMode } from '@stripe/stripe-js';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { checkoutService } from 'views/Checkout/services';
import { URGENT_CHECKOUT_THEME_STYLES } from '../constants';
import { useUrgentStripeAppearance } from './useUrgentStripeAppearance';

describe('Urgent checkout Stripe appearance', () => {
  const mockAppearance = { theme: 'flat', variables: { colorPrimary: 'rgb(255 255 255)' } };

  const mockStripeElementsOptions = {
    mode: 'subscription',
    amount: 1210,
    currency: 'eur',
    payment_method_types: ['card'],
  } as StripeElementsOptionsMode;

  const mockPriceWithTax: PriceWithTax = {
    price: {
      id: 'price_123',
      bytes: 1099511627776,
      decimalAmount: 10,
      product: 'prod_1234',
      currency: 'eur',
      amount: 1000,
      interval: 'year',
      type: UserType.Individual,
    },
    taxes: {
      amountWithTax: 1210,
      decimalTax: 2.1,
      tax: 210,
      decimalAmountWithTax: 12.1,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(checkoutService, 'loadStripeElements').mockResolvedValue({
      appearance: mockAppearance,
    } as StripeElementsOptionsMode);
  });

  it('When there is no price yet, then the Stripe elements are not loaded and no options are returned', () => {
    const { result } = renderHook(() => useUrgentStripeAppearance(mockStripeElementsOptions, undefined));

    expect(checkoutService.loadStripeElements).not.toHaveBeenCalled();
    expect(result.current).toBeUndefined();
  });

  it('When a price is given, then the elements are loaded with the urgent checkout theme', async () => {
    renderHook(() => useUrgentStripeAppearance(mockStripeElementsOptions, mockPriceWithTax));

    await waitFor(() => {
      expect(checkoutService.loadStripeElements).toHaveBeenCalledWith(URGENT_CHECKOUT_THEME_STYLES, mockPriceWithTax);
    });
  });

  it('When the appearance is loaded, then it is merged into the received Stripe elements options', async () => {
    const { result } = renderHook(() => useUrgentStripeAppearance(mockStripeElementsOptions, mockPriceWithTax));

    await waitFor(() => {
      expect(result.current).toStrictEqual({ ...mockStripeElementsOptions, appearance: mockAppearance });
    });
  });

  it('When there are no Stripe elements options, then no options are returned even after the appearance loads', async () => {
    const { result } = renderHook(() => useUrgentStripeAppearance(undefined, mockPriceWithTax));

    await waitFor(() => {
      expect(checkoutService.loadStripeElements).toHaveBeenCalled();
    });

    expect(result.current).toBeUndefined();
  });

  it('When the component re-renders with the same price, then the elements are not loaded again', async () => {
    const { rerender } = renderHook(({ price }) => useUrgentStripeAppearance(mockStripeElementsOptions, price), {
      initialProps: { price: mockPriceWithTax },
    });

    await waitFor(() => {
      expect(checkoutService.loadStripeElements).toHaveBeenCalledTimes(1);
    });

    rerender({ price: { ...mockPriceWithTax } });

    expect(checkoutService.loadStripeElements).toHaveBeenCalledTimes(1);
  });

  it('When the selected price changes, then the appearance is loaded again for the new price', async () => {
    const anotherPriceWithTax: PriceWithTax = {
      ...mockPriceWithTax,
      price: { ...mockPriceWithTax.price, id: 'price_456' },
    };

    const { rerender } = renderHook(({ price }) => useUrgentStripeAppearance(mockStripeElementsOptions, price), {
      initialProps: { price: mockPriceWithTax },
    });

    await waitFor(() => {
      expect(checkoutService.loadStripeElements).toHaveBeenCalledTimes(1);
    });

    rerender({ price: anotherPriceWithTax });

    await waitFor(() => {
      expect(checkoutService.loadStripeElements).toHaveBeenCalledWith(
        URGENT_CHECKOUT_THEME_STYLES,
        anotherPriceWithTax,
      );
    });
  });
});
