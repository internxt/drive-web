import { beforeEach, describe, expect, it, vi } from 'vitest';
import gaService from './ga.service';
import { bytesToString } from 'app/drive/services/size.service';
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
  globalThis.window.dataLayer = [];
  vi.clearAllMocks();
});

describe('Testing GA Service', () => {
  describe('track function', () => {
    it('When track is called with event name and object, then dataLayer should receive the event', () => {
      const eventName = 'test_event';
      const eventData = { key: 'value', number: 123 };

      gaService.track(eventName, eventData);

      expect(globalThis.window.dataLayer).toHaveLength(1);
      expect(globalThis.window.dataLayer[0]).toEqual({
        event: eventName,
        ...eventData,
      });
    });

    it('When track is called and dataLayer throws an error, then the error should be caught silently', () => {
      const mockDataLayer = {
        push: vi.fn(() => {
          throw new Error('DataLayer Error');
        }),
      };
      globalThis.window.dataLayer = mockDataLayer as any;

      expect(() => gaService.track('test_event', { key: 'value' })).not.toThrow();
      expect(mockDataLayer.push).toHaveBeenCalled();
    });
  });

  describe('trackBeginCheckout function', () => {
    describe('Successful tracking', () => {
      it('When trackBeginCheckout is called with basic params, then dataLayer should receive begin_checkout event', () => {
        gaService.trackBeginCheckout(mockTrackBeginCheckoutParams);

        expect(globalThis.window.dataLayer).toHaveLength(1);
        expect(globalThis.window.dataLayer[0].event).toBe('begin_checkout');
      });

      it('When trackBeginCheckout is called with coupon, then the event should include coupon data', () => {
        gaService.trackBeginCheckout(mockTrackBeginCheckoutParams);

        const event = globalThis.window.dataLayer[0] as any;
        expect(event.ecommerce).toMatchObject({
          currency: 'EUR',
        });
        expect(event.ecommerce.items[0]).toMatchObject({
          coupon: 'DISCOUNT20',
        });
      });

      it('When trackBeginCheckout is called without coupon, then the event should not include coupon data', () => {
        const paramsWithoutCoupon = {
          ...mockTrackBeginCheckoutParams,
          promoCodeId: undefined,
          couponCodeData: undefined,
        };

        gaService.trackBeginCheckout(paramsWithoutCoupon);

        const event = globalThis.window.dataLayer[0] as any;
        expect(event.ecommerce.items[0].coupon).toBeUndefined();
      });

      it('When trackBeginCheckout is called with discount, then the event should include discount amount', () => {
        gaService.trackBeginCheckout(mockTrackBeginCheckoutParams);

        const event = globalThis.window.dataLayer[0] as any;
        expect(event.ecommerce.items[0].discount).toBeDefined();
        expect(event.ecommerce.items[0].discount).toBeGreaterThan(0);
      });

      it('When trackBeginCheckout is called without discount, then the event should not include discount field', () => {
        const paramsWithoutCoupon = {
          ...mockTrackBeginCheckoutParams,
          couponCodeData: undefined,
        };

        gaService.trackBeginCheckout(paramsWithoutCoupon);

        const event = globalThis.window.dataLayer[0] as any;
        expect(event.ecommerce.items[0].discount).toBeUndefined();
      });

      it('When trackBeginCheckout is called with multiple seats, then the total value should be calculated correctly', () => {
        const paramsWithMultipleSeats = {
          ...mockTrackBeginCheckoutParams,
          seats: 5,
        };

        gaService.trackBeginCheckout(paramsWithMultipleSeats);

        const event = globalThis.window.dataLayer[0] as any;
        expect(event.ecommerce.items[0].quantity).toBe(5);
        expect(event.ecommerce.value).toBeGreaterThan(0);
      });

      it('When trackBeginCheckout is called with business plan, then item_category should be Business', () => {
        const businessParams = {
          ...mockTrackBeginCheckoutParams,
          planType: 'business' as const,
        };

        gaService.trackBeginCheckout(businessParams);

        const event = globalThis.window.dataLayer[0] as any;
        expect(event.ecommerce.items[0].item_category).toBe('Business');
      });

      it('When trackBeginCheckout is called with individual plan, then item_category should be Individual', () => {
        gaService.trackBeginCheckout(mockTrackBeginCheckoutParams);

        const event = globalThis.window.dataLayer[0] as any;
        expect(event.ecommerce.items[0].item_category).toBe('Individual');
      });

      it('When trackBeginCheckout is called with storage bytes, then storage should be formatted correctly', () => {
        const bytesToStringSpy = vi.mocked(bytesToString);

        gaService.trackBeginCheckout(mockTrackBeginCheckoutParams);

        expect(bytesToStringSpy).toHaveBeenCalledWith(1099511627776);
        const event = globalThis.window.dataLayer[0] as any;
        expect(event.ecommerce.items[0].item_name).toContain('1TB');
      });

      it('When trackBeginCheckout is called with interval, then item_name should be capitalized correctly', () => {
        gaService.trackBeginCheckout(mockTrackBeginCheckoutParams);

        const event = globalThis.window.dataLayer[0] as any;
        expect(event.ecommerce.items[0].item_name).toContain('Year');
        expect(event.ecommerce.items[0].item_variant).toBe('year');
      });

      it('When trackBeginCheckout is called without currency, then default currency should be EUR', () => {
        const paramsWithoutCurrency = {
          ...mockTrackBeginCheckoutParams,
          currency: undefined as unknown as string,
        };

        gaService.trackBeginCheckout(paramsWithoutCurrency);

        const event = globalThis.window.dataLayer[0] as any;
        expect(event.ecommerce.currency).toBe('EUR');
      });

      it('When trackBeginCheckout is called, then item_brand should always be Internxt', () => {
        gaService.trackBeginCheckout(mockTrackBeginCheckoutParams);

        const event = globalThis.window.dataLayer[0] as any;
        expect(event.ecommerce.items[0].item_brand).toBe('Internxt');
      });

      it('When trackBeginCheckout is called, then send_to should be included in the event', () => {
        gaService.trackBeginCheckout(mockTrackBeginCheckoutParams);

        const event = globalThis.window.dataLayer[0] as any;
        expect(event.send_to).toBeDefined();
        expect(Array.isArray(event.send_to)).toBe(true);
      });

      it('When trackBeginCheckout is called with all data, then the complete event structure should match expected format', () => {
        gaService.trackBeginCheckout(mockTrackBeginCheckoutParams);

        const event = globalThis.window.dataLayer[0] as any;
        expect(event).toMatchObject({
          event: 'begin_checkout',
          send_to: expect.any(Array),
          ecommerce: {
            currency: 'EUR',
            value: expect.any(Number),
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
          },
        });
      });
    });

    describe('Error handling', () => {
      it('When dataLayer throws an error during trackBeginCheckout, then the error should be caught silently', () => {
        const mockDataLayer = {
          push: vi.fn(() => {
            throw new Error('DataLayer Error');
          }),
        };
        globalThis.window.dataLayer = mockDataLayer as any;

        expect(() => gaService.trackBeginCheckout(mockTrackBeginCheckoutParams)).not.toThrow();
        expect(mockDataLayer.push).toHaveBeenCalled();
      });
    });

    describe('Edge cases', () => {
      it('When trackBeginCheckout is called with invalid storage string, then it should use the raw storage value', () => {
        const paramsWithInvalidStorage = {
          ...mockTrackBeginCheckoutParams,
          storage: 'invalid',
        };

        gaService.trackBeginCheckout(paramsWithInvalidStorage);

        const event = globalThis.window.dataLayer[0] as any;
        expect(event.ecommerce.items[0].item_name).toContain('invalid');
      });

      it('When trackBeginCheckout is called with amountOff coupon, then discount should be calculated correctly', () => {
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

        const event = globalThis.window.dataLayer[0] as any;
        expect(event.ecommerce.items[0].discount).toBeDefined();
      });

      it('When trackBeginCheckout is called without seats, then default seats should be 1', () => {
        const paramsWithoutSeats = {
          planId: 'price_123',
          planPrice: 119.88,
          currency: 'EUR',
          planType: 'individual' as const,
          interval: 'year',
          storage: '1099511627776',
        };

        gaService.trackBeginCheckout(paramsWithoutSeats);

        const event = globalThis.window.dataLayer[0] as any;
        expect(event.ecommerce.items[0].quantity).toBe(1);
      });
    });
  });
});
