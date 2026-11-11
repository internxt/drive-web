import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { useBillingDetails } from './useBillingDetails';

describe('Billing details checkout custom hook', () => {
  test('When a postal code is typed, then the billing country and postal code come from the detected location and the typed postal code', () => {
    const { result } = renderHook(() => useBillingDetails({ userLocation: 'ES' }));

    act(() => {
      result.current.onPostalCodeChanges('28001');
    });

    expect(result.current.billingCountry).toBe('ES');
    expect(result.current.billingPostalCode).toBe('28001');
  });

  test('When the typed postal code is only whitespace, then the billing postal code is undefined', () => {
    const { result } = renderHook(() => useBillingDetails({ userLocation: 'ES' }));

    act(() => {
      result.current.onPostalCodeChanges('   ');
    });

    expect(result.current.billingPostalCode).toBeUndefined();
  });

  test('When a company name is provided, then it is used as the customer name', () => {
    const { result } = renderHook(() => useBillingDetails({}));

    const customerName = result.current.getCustomerName({ companyName: 'Internxt' });

    expect(customerName).toBe('Internxt');
  });

  test('When no company name is provided, then the customer name falls back to the authenticated user full name', () => {
    const { result } = renderHook(() => useBillingDetails({}));

    const customerName = result.current.getCustomerName({
      authenticatedUser: { name: 'Homer', lastname: 'Simpson' } as any,
    });

    expect(customerName).toBe('Homer Simpson');
  });

  test('When no name is available anywhere, then the customer name falls back to the provided email', () => {
    const { result } = renderHook(() => useBillingDetails({}));

    const customerName = result.current.getCustomerName({ email: 'homer@inxt.com' });

    expect(customerName).toBe('homer@inxt.com');
  });
});
