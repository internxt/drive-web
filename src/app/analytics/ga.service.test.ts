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
    it('should push event to dataLayer when called with event name and data', () => {
      const eventName = 'test_event';
      const eventData = { key: 'value', number: 123 };

      gaService.track(eventName, eventData);

      expect(globalThis.window.dataLayer).toHaveLength(1);
      expect(globalThis.window.dataLayer[0]).toEqual({
        event: eventName,
        ...eventData,
      });
    });

    it('should handle errors gracefully when dataLayer throws an error', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockDataLayer = {
        push: vi.fn(() => {
          throw new Error('DataLayer Error');
        }),
      };
      globalThis.window.dataLayer = mockDataLayer as any;

      expect(() => gaService.track('test_event', { key: 'value' })).not.toThrow();
      expect(mockDataLayer.push).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('trackBeginCheckout function', () => {
    describe('Successful tracking', () => {
      it('should push begin_checkout event to dataLayer', () => {
        gaService.trackBeginCheckout(mockTrackBeginCheckoutParams);

        expect(globalThis.window.dataLayer).toHaveLength(1);
        expect(globalThis.window.dataLayer[0].event).toBe('begin_checkout');
      });

      it('should call gtag with send_to configuration', () => {
        gaService.trackBeginCheckout(mockTrackBeginCheckoutParams);

        expect(globalThis.window.gtag).toHaveBeenCalledWith(
          'event',
          'begin_checkout',
          expect.objectContaining({
            send_to: expect.any(Array),
          }),
        );
      });

      it('should include coupon code in the event when provided', () => {
        gaService.trackBeginCheckout(mockTrackBeginCheckoutParams);

        const event = globalThis.window.dataLayer[0] as any;
        expect(event.ecommerce.items[0]).toMatchObject({
          coupon: 'DISCOUNT20',
        });
      });

      it('should calculate and include discount amount when coupon is applied', () => {
        gaService.trackBeginCheckout(mockTrackBeginCheckoutParams);

        const event = globalThis.window.dataLayer[0] as any;
        expect(event.ecommerce.items[0].discount).toBeDefined();
        expect(event.ecommerce.items[0].discount).toBeGreaterThan(0);
      });

      it('should calculate total value correctly when multiple seats are purchased', () => {
        const paramsWithMultipleSeats = {
          ...mockTrackBeginCheckoutParams,
          seats: 5,
        };

        gaService.trackBeginCheckout(paramsWithMultipleSeats);

        const event = globalThis.window.dataLayer[0] as any;
        expect(event.ecommerce.items[0].quantity).toBe(5);
        expect(event.ecommerce.value).toBeGreaterThan(0);
      });

      it('should format storage bytes into human-readable format', () => {
        const bytesToStringSpy = vi.mocked(bytesToString);

        gaService.trackBeginCheckout(mockTrackBeginCheckoutParams);

        expect(bytesToStringSpy).toHaveBeenCalledWith(1099511627776);
        const event = globalThis.window.dataLayer[0] as any;
        expect(event.ecommerce.items[0].item_name).toContain('1TB');
      });

      it('should save item data to localStorage for later use in purchase event', () => {
        gaService.trackBeginCheckout(mockTrackBeginCheckoutParams);

        expect(localStorageService.set).toHaveBeenCalledWith(
          'checkout_item_data',
          expect.stringContaining('1TB Year Plan'),
        );
      });

      it('should save original price to localStorage for later use in purchase event', () => {
        gaService.trackBeginCheckout(mockTrackBeginCheckoutParams);

        expect(localStorageService.set).toHaveBeenCalledWith('itemOriginalPrice', expect.any(String));
      });
    });

    describe('Error handling', () => {
      it('should handle errors gracefully when tracking fails', () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const mockDataLayer = {
          push: vi.fn(() => {
            throw new Error('Tracking Error');
          }),
        };
        globalThis.window.dataLayer = mockDataLayer as any;

        expect(() => gaService.trackBeginCheckout(mockTrackBeginCheckoutParams)).not.toThrow();
        expect(consoleErrorSpy).toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
      });
    });
  });

  describe('trackPurchase function', () => {
    describe('Successful tracking', () => {
      it('should push purchase event to dataLayer with correct transaction and item data', async () => {
        vi.mocked(localStorageService.getUser).mockReturnValue({
          uuid: 'user_uuid_123',
          email: 'test@example.com',
        } as any);

        vi.mocked(localStorageService.get).mockImplementation((key) => {
          const store: Record<string, string> = {
            subscriptionId: 'sub_12345',
            paymentIntentId: '',
            priceId: 'price_yearly_2tb',
            currency: 'EUR',
            amountPaid: '95.90',
            couponCode: 'DISCOUNT20',
            itemOriginalPrice: '119.88',
            checkout_item_data: JSON.stringify({
              item_name: '2TB Year Plan',
              item_category: 'Individual',
              item_variant: 'year',
              discount: 23.98,
            }),
          };
          return store[key] || null;
        });

        await gaService.trackPurchase();

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
                price: 119.88,
                quantity: 1,
                item_brand: 'Internxt',
                coupon: 'DISCOUNT20',
                discount: 23.98,
              },
            ],
          },
        });
      });

      it('should use payment intent as transaction ID when available (lifetime plan)', async () => {
        vi.mocked(localStorageService.getUser).mockReturnValue({ uuid: 'user_uuid' } as any);
        vi.mocked(localStorageService.get).mockImplementation((key) => {
          if (key === 'paymentIntentId') return 'pi_999';
          if (key === 'subscriptionId') return 'sub_888';
          if (key === 'amountPaid') return '100';
          if (key === 'itemOriginalPrice') return '119.88';
          if (key === 'checkout_item_data')
            return JSON.stringify({
              item_name: '2TB Year Plan',
              item_category: 'Individual',
              item_variant: 'year',
              discount: 0,
            });
          return '';
        });

        await gaService.trackPurchase();

        const event = globalThis.window.dataLayer[0] as any;
        expect(event.ecommerce.transaction_id).toBe('pi_999');
      });

      it('should use subscription ID when payment intent is not available', async () => {
        vi.mocked(localStorageService.getUser).mockReturnValue({ uuid: 'user_uuid' } as any);
        vi.mocked(localStorageService.get).mockImplementation((key) => {
          if (key === 'paymentIntentId') return null;
          if (key === 'subscriptionId') return 'sub_888';
          if (key === 'amountPaid') return '100';
          if (key === 'itemOriginalPrice') return '119.88';
          if (key === 'checkout_item_data')
            return JSON.stringify({
              item_name: '2TB Year Plan',
              item_category: 'Individual',
              item_variant: 'year',
              discount: 0,
            });
          return '';
        });

        await gaService.trackPurchase();

        const event = globalThis.window.dataLayer[0] as any;
        expect(event.ecommerce.transaction_id).toBe('sub_888');
      });

      it('should fallback to user UUID when neither payment intent nor subscription ID are available', async () => {
        vi.mocked(localStorageService.getUser).mockReturnValue({ uuid: 'user_fallback_uuid' } as any);
        vi.mocked(localStorageService.get).mockImplementation((key) => {
          if (key === 'paymentIntentId') return null;
          if (key === 'subscriptionId') return null;
          if (key === 'amountPaid') return '100';
          if (key === 'itemOriginalPrice') return '119.88';
          if (key === 'checkout_item_data')
            return JSON.stringify({
              item_name: '2TB Year Plan',
              item_category: 'Individual',
              item_variant: 'year',
              discount: 0,
            });
          return '';
        });

        await gaService.trackPurchase();

        const event = globalThis.window.dataLayer[0] as any;
        expect(event.ecommerce.transaction_id).toBe('user_fallback_uuid');
      });

      it('should set user email for Enhanced Conversions when available', async () => {
        vi.mocked(localStorageService.getUser).mockReturnValue({
          uuid: 'user_123',
          email: 'customer@example.com',
        } as any);
        vi.mocked(localStorageService.get).mockImplementation((key) => {
          if (key === 'amountPaid') return '100';
          if (key === 'itemOriginalPrice') return '119.88';
          if (key === 'checkout_item_data')
            return JSON.stringify({
              item_name: '2TB Year Plan',
              item_category: 'Individual',
              item_variant: 'year',
              discount: 0,
            });
          return 'dummy_value';
        });

        await gaService.trackPurchase();

        expect(globalThis.window.gtag).toHaveBeenCalledWith('set', 'user_data', {
          email: 'customer@example.com',
        });
      });

      it('should clean up localStorage after successful tracking', async () => {
        vi.mocked(localStorageService.getUser).mockReturnValue({ uuid: 'user_123' } as any);
        vi.mocked(localStorageService.get).mockImplementation((key) => {
          if (key === 'amountPaid') return '100';
          if (key === 'itemOriginalPrice') return '119.88';
          if (key === 'checkout_item_data')
            return JSON.stringify({
              item_name: '2TB Year Plan',
              item_category: 'Individual',
              item_variant: 'year',
              discount: 0,
            });
          return 'dummy';
        });

        await gaService.trackPurchase();

        expect(localStorageService.removeItem).toHaveBeenCalledWith('checkout_item_data');
        expect(localStorageService.removeItem).toHaveBeenCalledWith('itemOriginalPrice');
      });

      it('should use fallback values when checkout item data is not available', async () => {
        vi.mocked(localStorageService.getUser).mockReturnValue({ uuid: 'user_123' } as any);
        vi.mocked(localStorageService.get).mockImplementation((key) => {
          if (key === 'checkout_item_data') return null;
          if (key === 'amountPaid') return '100';
          if (key === 'itemOriginalPrice') return null;
          return 'dummy';
        });

        await gaService.trackPurchase();

        expect(globalThis.window.dataLayer).toHaveLength(0);
      });

      it('should use original price from localStorage instead of amount paid', async () => {
        vi.mocked(localStorageService.getUser).mockReturnValue({ uuid: 'user_123' } as any);
        vi.mocked(localStorageService.get).mockImplementation((key) => {
          if (key === 'amountPaid') return '0';
          if (key === 'itemOriginalPrice') return '119.88';
          if (key === 'checkout_item_data')
            return JSON.stringify({
              item_name: '1TB Year Plan',
              item_category: 'Individual',
              item_variant: 'year',
              discount: 119.88,
            });
          return 'dummy';
        });

        await gaService.trackPurchase();

        const event = globalThis.window.dataLayer[0] as any;
        expect(event.ecommerce.items[0].price).toBe(119.88);
        expect(event.ecommerce.value).toBe(0);
      });

      it('should not track when checkout data is missing (already tracked)', async () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.mocked(localStorageService.getUser).mockReturnValue({ uuid: 'user_123' } as any);
        vi.mocked(localStorageService.get).mockImplementation((key) => {
          if (key === 'checkout_item_data') return null;
          return 'dummy';
        });

        await gaService.trackPurchase();

        expect(globalThis.window.dataLayer).toHaveLength(0);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          '[GA Service] No checkout data found, purchase may have already been tracked',
        );

        consoleWarnSpy.mockRestore();
      });
    });

    describe('Validation & Error Handling', () => {
      it('should not track when user is not logged in', async () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.mocked(localStorageService.getUser).mockReturnValue(null);

        await gaService.trackPurchase();

        expect(globalThis.window.dataLayer).toHaveLength(0);
        expect(globalThis.window.gtag).not.toHaveBeenCalled();
        expect(consoleWarnSpy).toHaveBeenCalled();

        consoleWarnSpy.mockRestore();
      });

      it('should not track when gtag is not available', async () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.mocked(localStorageService.getUser).mockReturnValue({ uuid: 'user_123' } as any);
        vi.mocked(localStorageService.get).mockImplementation((key) => {
          if (key === 'amountPaid') return '100';
          if (key === 'itemOriginalPrice') return '119.88';
          if (key === 'checkout_item_data')
            return JSON.stringify({
              item_name: '2TB Year Plan',
              item_category: 'Individual',
              item_variant: 'year',
              discount: 0,
            });
          return 'dummy';
        });
        globalThis.window.gtag = undefined as any;

        await gaService.trackPurchase();

        expect(consoleWarnSpy).toHaveBeenCalled();

        consoleWarnSpy.mockRestore();
      });

      it('should handle errors gracefully when dataLayer fails', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.mocked(localStorageService.getUser).mockReturnValue({ uuid: 'user_123' } as any);
        vi.mocked(localStorageService.get).mockImplementation((key) => {
          if (key === 'amountPaid') return '100';
          if (key === 'itemOriginalPrice') return '119.88';
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

        await expect(gaService.trackPurchase()).resolves.not.toThrow();
        expect(mockDataLayer.push).toHaveBeenCalled();
        expect(consoleErrorSpy).toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
      });

      it('should handle invalid JSON in checkout_item_data gracefully', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.mocked(localStorageService.getUser).mockReturnValue({ uuid: 'user_123' } as any);
        vi.mocked(localStorageService.get).mockImplementation((key) => {
          if (key === 'checkout_item_data') return 'invalid-json{';
          if (key === 'amountPaid') return '100';
          if (key === 'itemOriginalPrice') return '119.88';
          return 'dummy';
        });

        await gaService.trackPurchase();

        expect(consoleErrorSpy).toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
      });
    });
  });
});
