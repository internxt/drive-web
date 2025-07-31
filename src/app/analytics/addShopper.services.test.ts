import { describe, it, expect, beforeEach } from 'vitest';
import { sendAddShoppersConversion } from './addShoppers.services';

describe('sendAddShoppersConversion', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      window.dataLayer = [];
    }
  });

  it('should push event to dataLayer if all fields are valid and couponCodeData is "welcome"', () => {
    sendAddShoppersConversion({
      orderId: 'order-123',
      value: 50,
      currency: 'eur',
      couponCodeData: 'WELCOME',
      email: 'user@example.com',
    });

    expect(window.dataLayer.length).toBe(1);
    expect(window.dataLayer[0]).toEqual({
      event: 'addshoppers_conversion',
      order_id: 'order-123',
      value: 50,
      currency: 'EUR',
      email: 'user@example.com',
      offer_code: 'WELCOME',
    });
  });

  it('should not push event if any required field is missing', () => {
    const baseInput = {
      orderId: 'order-123',
      value: 50,
      currency: 'eur',
      couponCodeData: 'WELCOME',
      email: 'user@example.com',
    };

    const testCases = [
      { ...baseInput, orderId: undefined },
      { ...baseInput, value: 0 },
      { ...baseInput, currency: undefined },
      { ...baseInput, couponCodeData: undefined },
      { ...baseInput, email: undefined },
    ];

    testCases.forEach((input) => {
      window.dataLayer = [];
      sendAddShoppersConversion(input);
      expect(window.dataLayer.length).toBe(0);
    });
  });

  it('should not push event if couponCodeData is not "welcome"', () => {
    sendAddShoppersConversion({
      orderId: 'order-123',
      value: 50,
      currency: 'eur',
      couponCodeData: 'DISCOUNT10',
      email: 'user@example.com',
    });

    expect(window.dataLayer.length).toBe(0);
  });

  it('should not throw if window.dataLayer.push fails', () => {
    window.dataLayer = [];
    window.dataLayer.push = () => {
      throw new Error('Simulated error');
    };

    expect(() =>
      sendAddShoppersConversion({
        orderId: 'order-123',
        value: 50,
        currency: 'eur',
        couponCodeData: 'welcome',
        email: 'user@example.com',
      }),
    ).not.toThrow();
  });
});
