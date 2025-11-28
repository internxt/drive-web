import { beforeEach, describe, expect, it, vi } from 'vitest';
import gaService from './ga.service';
import { bytesToString } from 'app/drive/services/size.service';
import { formatPrice } from 'views/Checkout/utils/formatPrice';
import { getProductAmount } from 'views/Checkout/utils/getProductAmount';
import { CouponCodeData } from 'views/Checkout/types';

vi.mock('app/drive/services/size.service', () => ({
  bytesToString: vi.fn((bytes) => {
    if (bytes === 1099511627776) return '1TB';
    if (bytes === 2199023255552) return '2TB';
    return `${bytes}B`;
  }),
}));

vi.mock('views/Checkout/utils/formatPrice', () => ({
  formatPrice: vi.fn((price) => price.toFixed(2)),
}));

vi.mock('views/Checkout/utils/getProductAmount', () => ({
  getProductAmount: vi.fn((price, quantity, coupon) => {
    if (coupon?.percentOff) {
      const discount = price * (coupon.percentOff / 100);
      return (price - discount).toFixed(2);
    }
    if (coupon?.amountOff) {
      return (price - coupon.amountOff).toFixed(2);
    }
    return price.toFixed(2);
  }),
}));

const mockCouponCodeData: CouponCodeData = {
  amountOff: undefined,
  codeId: 'promo_123',
  percentOff: 20,
  codeName: 'DISCOUNT20',
};

const mockTrackBeginCheckoutParams = {
  planId: 'price_123',
  planPrice: 119.88,
  currency: 'EUR',
  planType: 'individual' as const,
  interval: 'year',
  storage: '1099511627776',
  promoCodeId: 'DISCOUNT20',
  couponCodeData: mockCouponCodeData,
  seats: 1,
};

beforeEach(() => {
  globalThis.window.gtag = vi.fn();
  vi.clearAllMocks();
});

describe('Testing GA Service', () => {
  describe('track function', () => {
    it('When track is called with event name and object, then gtag should be called with correct parameters', () => {
      const gTagSpy = vi.spyOn(globalThis.window, 'gtag');
      const eventName = 'test_event';
      const eventData = { key: 'value', number: 123 };

      gaService.track(eventName, eventData);

      expect(gTagSpy).toHaveBeenCalledTimes(1);
      expect(gTagSpy).toHaveBeenCalledWith('event', eventName, eventData);
    });

    it('When track is called and gtag throws an error, then the error should be caught silently', () => {
      const unknownError = new Error('Unknown Error');
      const gTagSpy = vi.spyOn(globalThis.window, 'gtag').mockImplementation(() => {
        throw unknownError;
      });

      expect(() => gaService.track('test_event', { key: 'value' })).not.toThrow();
      expect(gTagSpy).toHaveBeenCalled();
    });
  });

  describe('trackBeginCheckout function', () => {
    describe('Successful tracking', () => {
      it('When trackBeginCheckout is called with basic params, then gtag should be called with correct data structure', () => {
        const gTagSpy = vi.spyOn(globalThis.window, 'gtag');

        gaService.trackBeginCheckout(mockTrackBeginCheckoutParams);

        expect(gTagSpy).toHaveBeenCalledTimes(1);
        expect(gTagSpy).toHaveBeenCalledWith('event', 'begin_checkout', expect.any(Object));
      });

      it('When trackBeginCheckout is called with coupon, then the event should include coupon data', () => {
        const gTagSpy = vi.spyOn(globalThis.window, 'gtag');

        gaService.trackBeginCheckout(mockTrackBeginCheckoutParams);

        const callArgs = gTagSpy.mock.calls[0][2] as Record<string, any>;
        expect(callArgs).toMatchObject({
          currency: 'EUR',
          coupon: 'DISCOUNT20',
        });
        expect(callArgs.items[0]).toMatchObject({
          coupon: 'DISCOUNT20',
        });
      });

      it('When trackBeginCheckout is called without coupon, then the event should not include coupon data', () => {
        const gTagSpy = vi.spyOn(globalThis.window, 'gtag');
        const paramsWithoutCoupon = {
          ...mockTrackBeginCheckoutParams,
          promoCodeId: undefined,
          couponCodeData: undefined,
        };

        gaService.trackBeginCheckout(paramsWithoutCoupon);

        const callArgs = gTagSpy.mock.calls[0][2] as Record<string, any>;
        expect(callArgs.coupon).toBeUndefined();
        expect(callArgs.items[0].coupon).toBeUndefined();
      });

      it('When trackBeginCheckout is called with discount, then the event should include discount amount', () => {
        const gTagSpy = vi.spyOn(globalThis.window, 'gtag');

        gaService.trackBeginCheckout(mockTrackBeginCheckoutParams);

        const callArgs = gTagSpy.mock.calls[0][2] as Record<string, any>;
        expect(callArgs.items[0].discount).toBeDefined();
        expect(callArgs.items[0].discount).toBeGreaterThan(0);
      });

      it('When trackBeginCheckout is called without discount, then the event should not include discount field', () => {
        const gTagSpy = vi.spyOn(globalThis.window, 'gtag');
        const paramsWithoutCoupon = {
          ...mockTrackBeginCheckoutParams,
          couponCodeData: undefined,
        };

        gaService.trackBeginCheckout(paramsWithoutCoupon);

        const callArgs = gTagSpy.mock.calls[0][2] as Record<string, any>;
        expect(callArgs.items[0].discount).toBeUndefined();
      });

      it('When trackBeginCheckout is called with multiple seats, then the total value should be calculated correctly', () => {
        const gTagSpy = vi.spyOn(globalThis.window, 'gtag');
        const paramsWithMultipleSeats = {
          ...mockTrackBeginCheckoutParams,
          seats: 5,
        };

        gaService.trackBeginCheckout(paramsWithMultipleSeats);

        const callArgs = gTagSpy.mock.calls[0][2] as Record<string, any>;
        expect(callArgs.items[0].quantity).toBe(5);
        expect(callArgs.value).toBeGreaterThan(0);
      });

      it('When trackBeginCheckout is called with business plan, then item_category should be Business', () => {
        const gTagSpy = vi.spyOn(globalThis.window, 'gtag');
        const businessParams = {
          ...mockTrackBeginCheckoutParams,
          planType: 'business' as const,
        };

        gaService.trackBeginCheckout(businessParams);

        const callArgs = gTagSpy.mock.calls[0][2] as Record<string, any>;
        expect(callArgs.items[0].item_category).toBe('Business');
      });

      it('When trackBeginCheckout is called with individual plan, then item_category should be Individual', () => {
        const gTagSpy = vi.spyOn(globalThis.window, 'gtag');

        gaService.trackBeginCheckout(mockTrackBeginCheckoutParams);

        const callArgs = gTagSpy.mock.calls[0][2] as Record<string, any>;
        expect(callArgs.items[0].item_category).toBe('Individual');
      });

      it('When trackBeginCheckout is called with storage bytes, then storage should be formatted correctly', () => {
        const gTagSpy = vi.spyOn(globalThis.window, 'gtag');
        const bytesToStringSpy = vi.mocked(bytesToString);

        gaService.trackBeginCheckout(mockTrackBeginCheckoutParams);

        expect(bytesToStringSpy).toHaveBeenCalledWith(1099511627776);
        const callArgs = gTagSpy.mock.calls[0][2] as Record<string, any>;
        expect(callArgs.items[0].item_name).toContain('1TB');
      });

      it('When trackBeginCheckout is called with interval, then item_name should be capitalized correctly', () => {
        const gTagSpy = vi.spyOn(globalThis.window, 'gtag');

        gaService.trackBeginCheckout(mockTrackBeginCheckoutParams);

        const callArgs = gTagSpy.mock.calls[0][2] as Record<string, any>;
        expect(callArgs.items[0].item_name).toContain('Year');
        expect(callArgs.items[0].item_variant).toBe('year');
      });

      it('When trackBeginCheckout is called without currency, then default currency should be EUR', () => {
        const gTagSpy = vi.spyOn(globalThis.window, 'gtag');
        const paramsWithoutCurrency = {
          ...mockTrackBeginCheckoutParams,
          currency: undefined as unknown as string,
        };

        gaService.trackBeginCheckout(paramsWithoutCurrency);

        const callArgs = gTagSpy.mock.calls[0][2] as Record<string, any>;
        expect(callArgs.currency).toBe('EUR');
      });

      it('When trackBeginCheckout is called, then item_brand should always be Internxt', () => {
        const gTagSpy = vi.spyOn(globalThis.window, 'gtag');

        gaService.trackBeginCheckout(mockTrackBeginCheckoutParams);

        const callArgs = gTagSpy.mock.calls[0][2] as Record<string, any>;
        expect(callArgs.items[0].item_brand).toBe('Internxt');
      });

      it('When trackBeginCheckout is called with all data, then the complete event structure should match expected format', () => {
        const gTagSpy = vi.spyOn(globalThis.window, 'gtag');

        gaService.trackBeginCheckout(mockTrackBeginCheckoutParams);

        expect(gTagSpy).toHaveBeenCalledWith('event', 'begin_checkout', {
          currency: 'EUR',
          value: expect.any(Number),
          coupon: 'DISCOUNT20',
          items: [
            {
              item_id: 'price_123',
              item_name: expect.stringContaining('Plan'),
              item_category: 'Individual',
              item_variant: 'year',
              price: expect.any(Number),
              quantity: 1,
              item_brand: 'Internxt',
              coupon: 'DISCOUNT20',
              discount: expect.any(Number),
            },
          ],
        });
      });
    });

    describe('Error handling', () => {
      it('When gtag throws an error during trackBeginCheckout, then the error should be caught silently', () => {
        const unknownError = new Error('Unknown Error');
        const gTagSpy = vi.spyOn(globalThis.window, 'gtag').mockImplementation(() => {
          throw unknownError;
        });

        expect(() => gaService.trackBeginCheckout(mockTrackBeginCheckoutParams)).not.toThrow();
        expect(gTagSpy).toHaveBeenCalled();
      });
    });

    describe('Edge cases', () => {
      it('When trackBeginCheckout is called with invalid storage string, then it should use the raw storage value', () => {
        const gTagSpy = vi.spyOn(globalThis.window, 'gtag');
        const paramsWithInvalidStorage = {
          ...mockTrackBeginCheckoutParams,
          storage: 'invalid',
        };

        gaService.trackBeginCheckout(paramsWithInvalidStorage);

        const callArgs = gTagSpy.mock.calls[0][2] as Record<string, any>;
        expect(callArgs.items[0].item_name).toContain('invalid');
      });

      it('When trackBeginCheckout is called with amountOff coupon, then discount should be calculated correctly', () => {
        const gTagSpy = vi.spyOn(globalThis.window, 'gtag');
        const amountOffCoupon: CouponCodeData = {
          amountOff: 20,
          codeId: 'promo_456',
          percentOff: undefined,
          codeName: 'FLAT20',
        };
        const paramsWithAmountOff = {
          ...mockTrackBeginCheckoutParams,
          couponCodeData: amountOffCoupon,
        };

        gaService.trackBeginCheckout(paramsWithAmountOff);

        const callArgs = gTagSpy.mock.calls[0][2] as Record<string, any>;
        expect(callArgs.items[0].discount).toBeDefined();
      });

      it('When trackBeginCheckout is called without seats, then default seats should be 1', () => {
        const gTagSpy = vi.spyOn(globalThis.window, 'gtag');
        const paramsWithoutSeats = {
          planId: 'price_123',
          planPrice: 119.88,
          currency: 'EUR',
          planType: 'individual' as const,
          interval: 'year',
          storage: '1099511627776',
        };

        gaService.trackBeginCheckout(paramsWithoutSeats);

        const callArgs = gTagSpy.mock.calls[0][2] as Record<string, any>;
        expect(callArgs.items[0].quantity).toBe(1);
      });
    });
  });
});
