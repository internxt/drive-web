import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { UserType } from '@internxt/sdk/dist/drive/payments/types/types';
import { useBillingDetails } from './useBillingDetails';
import { PaymentType } from '../types';
import { AddressProvider } from '../types/checkout.types';

const mockSelectedPlan: PriceWithTax = {
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

const mockAddress: AddressProvider = {
  line1: 'Main Street 1',
  line2: null,
  city: 'New York',
  state: 'NY',
  postal_code: '10001',
  country: 'US',
};

const buildProps = (overrides = {}) => ({
  initialUserName: undefined,
  userLocation: undefined,
  promotionCode: undefined,
  selectedPlan: mockSelectedPlan,
  fetchSelectedPlan: vi.fn().mockResolvedValue(mockSelectedPlan),
  ...overrides,
});

describe('Billing details custom hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Initial values', () => {
    test('When the hook is initialized, then the billing fields start empty with euros as the default currency', () => {
      const { result } = renderHook(() => useBillingDetails(buildProps()));

      expect(result.current.address).toBeUndefined();
      expect(result.current.userName).toBe('');
      expect(result.current.postalCode).toBe('');
      expect(result.current.selectedCurrency).toBe('eur');
      expect(result.current.currencyType).toBeUndefined();
    });

    test('When the user already has a name, then it is used as the starting billing name', () => {
      const { result } = renderHook(() => useBillingDetails(buildProps({ initialUserName: 'Jane Doe' })));

      expect(result.current.userName).toBe('Jane Doe');
    });
  });

  describe('Postal code requirement by country', () => {
    test('When the user is located in a country that requires a postal code, then it is flagged as required', () => {
      const { result } = renderHook(() => useBillingDetails(buildProps({ userLocation: 'US' })));

      expect(result.current.isPostalCodeRequired).toBe(true);
    });

    test('When the user is located in a country that does not require a postal code, then it is not flagged as required', () => {
      const { result } = renderHook(() => useBillingDetails(buildProps({ userLocation: 'ES' })));

      expect(result.current.isPostalCodeRequired).toBe(false);
    });
  });

  describe('Recalculating taxes when the billing location changes', () => {
    test('When a complete billing address is provided, then the plan price is recalculated for that location', () => {
      const fetchSelectedPlan = vi.fn().mockResolvedValue(mockSelectedPlan);
      const { result } = renderHook(() => useBillingDetails(buildProps({ fetchSelectedPlan, promotionCode: 'SUMMER' })));

      act(() => {
        result.current.onUserAddressChanges(mockAddress);
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(fetchSelectedPlan).toHaveBeenCalledWith({
        priceId: 'price_123',
        currency: 'eur',
        promotionCode: 'SUMMER',
        postalCode: '10001',
        country: 'US',
      });
    });

    test('When the postal code is typed and the country comes from the user location, then taxes are recalculated with both values', () => {
      const fetchSelectedPlan = vi.fn().mockResolvedValue(mockSelectedPlan);
      const { result } = renderHook(() => useBillingDetails(buildProps({ fetchSelectedPlan, userLocation: 'US' })));

      act(() => {
        result.current.onPostalCodeChanges('90210');
      });

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(fetchSelectedPlan).toHaveBeenCalledWith(
        expect.objectContaining({ postalCode: '90210', country: 'US' }),
      );
    });

    test('When there is no billing country nor postal code, then taxes are not recalculated', () => {
      const fetchSelectedPlan = vi.fn().mockResolvedValue(mockSelectedPlan);
      renderHook(() => useBillingDetails(buildProps({ fetchSelectedPlan })));

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(fetchSelectedPlan).not.toHaveBeenCalled();
    });

    test('When the address changes again before the debounce elapses, then only the latest location triggers a recalculation', () => {
      const fetchSelectedPlan = vi.fn().mockResolvedValue(mockSelectedPlan);
      const { result } = renderHook(() => useBillingDetails(buildProps({ fetchSelectedPlan })));

      act(() => {
        result.current.onUserAddressChanges(mockAddress);
      });
      act(() => {
        vi.advanceTimersByTime(200);
      });
      act(() => {
        result.current.onUserAddressChanges({ ...mockAddress, postal_code: '20002', country: 'CA' });
      });
      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(fetchSelectedPlan).toHaveBeenCalledTimes(1);
      expect(fetchSelectedPlan).toHaveBeenCalledWith(
        expect.objectContaining({ postalCode: '20002', country: 'CA' }),
      );
    });
  });

  describe('Updating billing fields', () => {
    test('When the billing name changes, then it is stored', () => {
      const { result } = renderHook(() => useBillingDetails(buildProps()));

      act(() => {
        result.current.onUserNameChanges('John Smith');
      });

      expect(result.current.userName).toBe('John Smith');
    });

    test('When the payment type changes to crypto, then it is stored as the current currency type', () => {
      const { result } = renderHook(() => useBillingDetails(buildProps()));

      act(() => {
        result.current.onCurrencyTypeChanges(PaymentType.CRYPTO);
      });

      expect(result.current.currencyType).toBe(PaymentType.CRYPTO);
    });

    test('When the selected currency changes, then it is stored', () => {
      const { result } = renderHook(() => useBillingDetails(buildProps()));

      act(() => {
        result.current.onCurrencyChange('usd');
      });

      expect(result.current.selectedCurrency).toBe('usd');
    });
  });
});
