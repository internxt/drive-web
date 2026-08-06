import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePriceRefetchOnAddressChange } from './usePriceRefetchOnAddressChange';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { UserType } from '@internxt/sdk/dist/drive/payments/types/types';

describe('usePriceRefetchOnAddressChange', () => {
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
    },
    taxes: {
      amountWithTax: 1210,
      decimalTax: 12.1,
      tax: 210,
      decimalAmountWithTax: 12.1,
    },
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  test('does not refetch when the billing country is missing', () => {
    const fetchSelectedPlan = vi.fn();

    renderHook(() =>
      usePriceRefetchOnAddressChange({
        selectedPlan: mockPriceWithTax,
        billingCountry: undefined,
        billingPostalCode: '28001',
        fetchSelectedPlan,
      }),
    );

    vi.advanceTimersByTime(1000);

    expect(fetchSelectedPlan).not.toHaveBeenCalled();
  });

  test('does not refetch when the billing postal code is missing, even if the country is already known from geolocation', () => {
    const fetchSelectedPlan = vi.fn();

    renderHook(() =>
      usePriceRefetchOnAddressChange({
        selectedPlan: mockPriceWithTax,
        billingCountry: 'ES',
        billingPostalCode: undefined,
        fetchSelectedPlan,
      }),
    );

    vi.advanceTimersByTime(1000);

    expect(fetchSelectedPlan).not.toHaveBeenCalled();
  });

  test('does not refetch when there is no selected plan yet', () => {
    const fetchSelectedPlan = vi.fn();

    renderHook(() =>
      usePriceRefetchOnAddressChange({
        selectedPlan: undefined,
        billingCountry: 'ES',
        billingPostalCode: '28001',
        fetchSelectedPlan,
      }),
    );

    vi.advanceTimersByTime(1000);

    expect(fetchSelectedPlan).not.toHaveBeenCalled();
  });

  test('refetches with both country and postal code once both are known, after debouncing', () => {
    const fetchSelectedPlan = vi.fn();

    renderHook(() =>
      usePriceRefetchOnAddressChange({
        selectedPlan: mockPriceWithTax,
        billingCountry: 'ES',
        billingPostalCode: '28001',
        promotionCode: 'SUMMER20',
        fetchSelectedPlan,
      }),
    );

    expect(fetchSelectedPlan).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);

    expect(fetchSelectedPlan).toHaveBeenCalledWith({
      priceId: 'price_123',
      currency: 'eur',
      promotionCode: 'SUMMER20',
      postalCode: '28001',
      country: 'ES',
    });
  });

  test('debounces rapid postal code changes into a single request', () => {
    const fetchSelectedPlan = vi.fn();

    const { rerender } = renderHook(
      (props) => usePriceRefetchOnAddressChange(props),
      {
        initialProps: {
          selectedPlan: mockPriceWithTax,
          billingCountry: 'ES',
          billingPostalCode: '2800',
          fetchSelectedPlan,
        },
      },
    );

    vi.advanceTimersByTime(300);
    rerender({
      selectedPlan: mockPriceWithTax,
      billingCountry: 'ES',
      billingPostalCode: '28001',
      fetchSelectedPlan,
    });
    vi.advanceTimersByTime(300);
    rerender({
      selectedPlan: mockPriceWithTax,
      billingCountry: 'ES',
      billingPostalCode: '28002',
      fetchSelectedPlan,
    });

    expect(fetchSelectedPlan).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);

    expect(fetchSelectedPlan).toHaveBeenCalledTimes(1);
    expect(fetchSelectedPlan).toHaveBeenCalledWith(expect.objectContaining({ postalCode: '28002' }));
  });
});
