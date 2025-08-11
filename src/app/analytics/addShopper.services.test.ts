import { describe, it, expect, beforeEach } from 'vitest';
import { sendAddShoppersConversion } from './addShoppers.services';

const baseOrder = {
  orderId: 'order-123',
  value: 50,
  currency: 'eur',
  couponCodeName: 'WELCOME',
  email: 'user@example.com',
};

describe('sendAddShoppersConversion', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      window.dataLayer = [];
    }
  });

  it('should push event to dataLayer if all fields are valid and couponCodeName is "welcome"', () => {
    sendAddShoppersConversion(baseOrder);

    expect(window.dataLayer).toStrictEqual([
      {
        event: 'addshoppers_conversion',
        order_id: 'order-123',
        value: 50,
        currency: 'EUR',
        email: 'user@example.com',
        offer_code: 'WELCOME',
      },
    ]);
  });

  it.each([
    ['missing orderId', { ...baseOrder, orderId: undefined }],
    ['zero value', { ...baseOrder, value: 0 }],
    ['missing currency', { ...baseOrder, currency: undefined }],
    ['missing couponCodeName', { ...baseOrder, couponCodeName: undefined }],
    ['missing email', { ...baseOrder, email: undefined }],
  ])('should not push event if %s', (_, input) => {
    sendAddShoppersConversion(input);
    expect(window.dataLayer).toStrictEqual([]);
  });

  it('should not push event if couponCodeName is not "welcome"', () => {
    sendAddShoppersConversion({ ...baseOrder, couponCodeName: 'DISCOUNT10' });
    expect(window.dataLayer).toStrictEqual([]);
  });

  it('should not throw if window.dataLayer.push fails', () => {
    window.dataLayer = [];
    window.dataLayer.push = () => {
      throw new Error('Simulated error');
    };

    expect(() => sendAddShoppersConversion({ ...baseOrder, couponCodeName: 'welcome' })).not.toThrow();
  });
});
