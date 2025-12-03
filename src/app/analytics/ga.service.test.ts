import { beforeEach, describe, expect, it, vi } from 'vitest';
import gaService from './ga.service';
import { bytesToString } from 'app/drive/services/size.service';
import { CouponCodeData } from 'views/Checkout/types';
import localStorageService from 'services/local-storage.service';

vi.mock('app/drive/services/size.service', () => ({
  bytesToString: vi.fn((bytes) => {
    if (!bytes || bytes < 1024) return undefined;
    if (bytes === 1099511627776) return '1TB';
    if (bytes === 2199023255552) return '2TB';
    return `${bytes}B`;
  }),
}));

vi.mock('views/Checkout/utils/formatPrice', () => ({
  formatPrice: vi.fn((price) => Number(price).toFixed(2)),
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

vi.mock('services/env.service', () => ({
  default: {
    getVariable: vi.fn((key) => {
      if (key === 'gaId') return 'G-TEST_ID';
      if (key === 'gaConversionTag') return 'AW-TEST_TAG';
      return undefined;
    }),
  },
}));

vi.mock('services/local-storage.service', () => ({
  default: {
    getUser: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    removeItem: vi.fn(),
  },
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
  globalThis.window.gtag = vi.fn();
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

      it('When trackBeginCheckout is called, then gtag should be called with send_to included', () => {
        gaService.trackBeginCheckout(mockTrackBeginCheckoutParams);

        expect(globalThis.window.gtag).toHaveBeenCalledWith(
          'event',
          'begin_checkout',
          expect.objectContaining({
            send_to: expect.any(Array),
          }),
        );
      });

      it('When trackBeginCheckout is called with coupon, then the event should include coupon data', () => {
        gaService.trackBeginCheckout(mockTrackBeginCheckoutParams);

        const event = globalThis.window.dataLayer[0] as any;
        expect(event.ecommerce.items[0]).toMatchObject({
          coupon: 'DISCOUNT20',
        });
      });

      it('When trackBeginCheckout is called with discount, then the event should include discount amount', () => {
        gaService.trackBeginCheckout(mockTrackBeginCheckoutParams);

        const event = globalThis.window.dataLayer[0] as any;
        expect(event.ecommerce.items[0].discount).toBeDefined();
        expect(event.ecommerce.items[0].discount).toBeGreaterThan(0);
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

      it('When trackBeginCheckout is called with storage bytes, then storage should be formatted correctly', () => {
        const bytesToStringSpy = vi.mocked(bytesToString);

        gaService.trackBeginCheckout(mockTrackBeginCheckoutParams);

        expect(bytesToStringSpy).toHaveBeenCalledWith(1099511627776);
        const event = globalThis.window.dataLayer[0] as any;
        expect(event.ecommerce.items[0].item_name).toContain('1TB');
      });

      it('When trackBeginCheckout is called, then item data should be saved to localStorage', () => {
        gaService.trackBeginCheckout(mockTrackBeginCheckoutParams);

        expect(localStorageService.set).toHaveBeenCalledWith(
          'checkout_item_data',
          expect.stringContaining('1TB Year Plan'),
        );
      });
    });
  });

  describe('trackPurchase function', () => {
    describe('Successful tracking', () => {
      it('When trackPurchase is called with valid localStorage data, then dataLayer should receive purchase event with correct transaction_id', () => {
        vi.mocked(localStorageService.getUser).mockReturnValue({
          uuid: 'user_uuid_123',
          email: 'test@example.com',
        } as any);

        vi.mocked(localStorageService.get).mockImplementation((key) => {
          const store: Record<string, string> = {
            subscriptionId: 'sub_12345',
            paymentIntentId: '',
            productName: '2TB Yearly Plan',
            priceId: 'price_yearly_2tb',
            currency: 'EUR',
            amountPaid: '95.90',
            couponCode: 'DISCOUNT20',
            checkout_item_data: JSON.stringify({
              item_name: '2TB Year Plan',
              item_category: 'Individual',
              item_variant: 'year',
              discount: 23.98,
            }),
          };
          return store[key] || null;
        });

        gaService.trackPurchase();

        expect(globalThis.window.dataLayer).toHaveLength(1);
        const event = globalThis.window.dataLayer[0] as any;

        expect(event).toMatchObject({
          event: 'purchase',
          ecommerce: {
            transaction_id: 'sub_12345',
            currency: 'EUR',
            value: 95.9,
            items: [
              {
                item_id: 'price_yearly_2tb',
                item_name: '2TB Year Plan',
                item_category: 'Individual',
                item_variant: 'year',
                price: 95.9,
                quantity: 1,
                item_brand: 'Internxt',
                coupon: 'DISCOUNT20',
                discount: 23.98,
              },
            ],
          },
        });
      });

      it('When trackPurchase is called with PaymentIntent, it should take precedence over SubscriptionId and UUID', () => {
        vi.mocked(localStorageService.getUser).mockReturnValue({ uuid: 'user_uuid' } as any);
        vi.mocked(localStorageService.get).mockImplementation((key) => {
          if (key === 'paymentIntentId') return 'pi_999';
          if (key === 'subscriptionId') return 'sub_888';
          if (key === 'amountPaid') return '100';
          if (key === 'checkout_item_data')
            return JSON.stringify({
              item_name: '2TB Year Plan',
              item_category: 'Individual',
              item_variant: 'year',
              discount: 0,
            });
          return '';
        });

        gaService.trackPurchase();

        const event = globalThis.window.dataLayer[0] as any;
        expect(event.ecommerce.transaction_id).toBe('pi_999');
      });

      it('When trackPurchase is called with user email, then it should set user_data for Enhanced Conversions', () => {
        vi.mocked(localStorageService.getUser).mockReturnValue({
          uuid: 'user_123',
          email: 'customer@example.com',
        } as any);
        vi.mocked(localStorageService.get).mockImplementation((key) => {
          if (key === 'amountPaid') return '100';
          if (key === 'checkout_item_data')
            return JSON.stringify({
              item_name: '2TB Year Plan',
              item_category: 'Individual',
              item_variant: 'year',
              discount: 0,
            });
          return 'dummy_value';
        });

        gaService.trackPurchase();

        expect(globalThis.window.gtag).toHaveBeenCalledWith('set', 'user_data', {
          email: 'customer@example.com',
        });
      });

      it('When trackPurchase is called, then checkout_item_data should be removed from localStorage', () => {
        vi.mocked(localStorageService.getUser).mockReturnValue({ uuid: 'user_123' } as any);
        vi.mocked(localStorageService.get).mockImplementation((key) => {
          if (key === 'amountPaid') return '100';
          if (key === 'checkout_item_data')
            return JSON.stringify({
              item_name: '2TB Year Plan',
              item_category: 'Individual',
              item_variant: 'year',
              discount: 0,
            });
          return 'dummy';
        });

        gaService.trackPurchase();

        expect(localStorageService.removeItem).toHaveBeenCalledWith('checkout_item_data');
      });

      it('When trackPurchase is called without checkout_item_data, then it should use fallback values', () => {
        vi.mocked(localStorageService.getUser).mockReturnValue({ uuid: 'user_123' } as any);
        vi.mocked(localStorageService.get).mockImplementation((key) => {
          if (key === 'checkout_item_data') return null;
          if (key === 'amountPaid') return '100';
          return 'dummy';
        });

        gaService.trackPurchase();

        const event = globalThis.window.dataLayer[0] as any;
        expect(event.ecommerce.items[0].item_name).toBe('Unknown Plan');
        expect(event.ecommerce.items[0].item_category).toBe('Individual');
        expect(event.ecommerce.items[0].item_variant).toBe('month');
      });
    });

    describe('Validation & Error Handling', () => {
      it('When trackPurchase is called but no user is logged in (localStorage returns null), then nothing should happen', () => {
        vi.mocked(localStorageService.getUser).mockReturnValue(null);

        gaService.trackPurchase();

        expect(globalThis.window.dataLayer).toHaveLength(0);
        expect(globalThis.window.gtag).not.toHaveBeenCalled();
      });

      it('When dataLayer throws error during trackPurchase, it should be caught silently', () => {
        vi.mocked(localStorageService.getUser).mockReturnValue({ uuid: 'user_123' } as any);
        vi.mocked(localStorageService.get).mockImplementation((key) => {
          if (key === 'amountPaid') return '100';
          if (key === 'checkout_item_data')
            return JSON.stringify({
              item_name: '2TB Year Plan',
              item_category: 'Individual',
              item_variant: 'year',
              discount: 0,
            });
          return 'dummy';
        });
        const mockDataLayer = {
          push: vi.fn(() => {
            throw new Error('DL Error');
          }),
        };
        globalThis.window.dataLayer = mockDataLayer as any;

        expect(() => gaService.trackPurchase()).not.toThrow();
        expect(mockDataLayer.push).toHaveBeenCalled();
      });
    });
  });
});
