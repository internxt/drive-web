import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { AddressProvider } from '../types/checkout.types';
import { useBillingDetails } from './useBillingDetails';

const mockAddress: AddressProvider = {
  line1: '742 Evergreen Terrace',
  line2: null,
  city: 'Springfield',
  state: 'OR',
  postal_code: '97403',
  country: 'US',
};

describe('Billing details checkout custom hook', () => {
  test('When the user is located in a country that requires a postal code, then the postal code is marked as required', () => {
    const { result } = renderHook(() => useBillingDetails({ userLocation: 'US' }));

    expect(result.current.isPostalCodeRequired).toBe(true);
  });

  test('When the user is located in a country that does not require a postal code, then the postal code is not required', () => {
    const { result } = renderHook(() => useBillingDetails({ userLocation: 'ES' }));

    expect(result.current.isPostalCodeRequired).toBe(false);
  });

  test('When no address is provided, then the billing country and postal code fall back to the detected location and the typed postal code', () => {
    const { result } = renderHook(() => useBillingDetails({ userLocation: 'ES' }));

    act(() => {
      result.current.onPostalCodeChanges('28001');
    });

    expect(result.current.billingCountry).toBe('ES');
    expect(result.current.billingPostalCode).toBe('28001');
  });

  test('When an address is provided, then its country and postal code take precedence over the detected location', () => {
    const { result } = renderHook(() => useBillingDetails({ userLocation: 'ES' }));

    act(() => {
      result.current.onUserAddressChanges(mockAddress);
    });

    expect(result.current.billingCountry).toBe('US');
    expect(result.current.billingPostalCode).toBe('97403');
  });

  test('When the typed postal code is only whitespace and no address exists, then the billing postal code is undefined', () => {
    const { result } = renderHook(() => useBillingDetails({ userLocation: 'ES' }));

    act(() => {
      result.current.onPostalCodeChanges('   ');
    });

    expect(result.current.billingPostalCode).toBeUndefined();
  });

  test('When the address or the customer name are missing, then the crypto address is considered incomplete', () => {
    const { result } = renderHook(() => useBillingDetails({}));

    expect(result.current.isCryptoAddressIncomplete).toBe(true);
  });

  test('When a full address and a customer name are provided, then the crypto address is considered complete', () => {
    const { result } = renderHook(() => useBillingDetails({}));

    act(() => {
      result.current.onUserNameChanges('Homer Simpson');
      result.current.onUserAddressChanges(mockAddress);
    });

    expect(result.current.isCryptoAddressIncomplete).toBe(false);
  });

  test('When a company name is provided, then it is used as the customer name', () => {
    const { result } = renderHook(() => useBillingDetails({}));

    const customerName = result.current.getCustomerName({ companyName: 'Internxt' });

    expect(customerName).toBe('Internxt');
  });

  test('When no company name is provided, then the typed user name is used as the customer name', () => {
    const { result } = renderHook(() => useBillingDetails({}));

    act(() => {
      result.current.onUserNameChanges('Homer Simpson');
    });

    const customerName = result.current.getCustomerName({});

    expect(customerName).toBe('Homer Simpson');
  });

  test('When neither company name nor typed user name are provided, then the customer name falls back to the authenticated user full name', () => {
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
