import { beforeEach, describe, expect, it, vi } from 'vitest';
import { savePaymentDataInLocalStorage, trackPaymentConversion, trackSignUp } from './impact.service';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { getProductAmount } from 'views/Checkout/utils';
import axios from 'axios';
import localStorageService from 'services/local-storage.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { bytesToString } from 'app/drive/services/size.service';
import errorService from 'services/error.service';
import dayjs from 'dayjs';
import envService from 'services/env.service';

vi.mock('services/local-storage.service', () => ({
  default: {
    get: vi.fn(),
    clear: vi.fn(),
    getUser: vi.fn(),
    set: vi.fn(),
  },
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => mockedUserUuid),
}));

vi.mock('./utils', () => ({
  getCookie: vi.fn((key) => {
    if (key === 'impactAnonymousId') return 'anon_id';
    if (key === 'impactSource') return 'ads';
    if (key === 'gclid') return '';
    return '';
  }),
}));

vi.mock('./addShoppers.services', () => ({
  sendAddShoppersConversion: vi.fn(),
}));

vi.mock('services/error.service', () => ({
  default: {
    castError: vi.fn().mockImplementation((e) => e),
    reportError: vi.fn(),
  },
}));

const subId = 'sub_123';
const paymentIntentId = 'py_123';
const mockedUserUuid = '00000000-0000-0000-0000-0000000000';
const mockImpactApiUrl = 'mock-impact-api-url';

const promoCode = {
  amountOff: undefined,
  codeId: 'promo_123',
  percentOff: 99,
  codeName: 'PROMO',
};

const product = {
  price: {
    id: 'price_123',
    currency: 'eur',
    amount: 11988,
    bytes: 1099511627776,
    interval: 'year',
    decimalAmount: 119.88,
    type: 'individual',
    product: 'prod_1234',
  },
  taxes: {
    tax: 25,
    decimalTax: 0.25,
    amountWithTax: 145,
    decimalAmountWithTax: 1.45,
  },
};

const expectedAmount = getProductAmount(product.price.decimalAmount, 1, promoCode);
const planName = bytesToString(product.price.bytes) + product.price.interval;

beforeEach(() => {
  globalThis.window.gtag = vi.fn();
  vi.clearAllMocks();
  vi.resetModules();

  vi.spyOn(envService, 'getVariable').mockImplementation((key) => {
    if (key === 'impactApiUrl') return mockImpactApiUrl;
    return 'no mock implementation';
  });

  vi.spyOn(localStorageService, 'getUser').mockReturnValue({
    uuid: mockedUserUuid,
    email: 'usuario@ejemplo.com',
  } as unknown as UserSettings);

  vi.spyOn(localStorageService, 'get').mockImplementation((key) => {
    if (key === 'paymentIntentId') return paymentIntentId;
    if (key === 'subscriptionId') return subId;
    if (key === 'productName') return planName;
    if (key === 'priceId') return product.price.id;
    if (key === 'currency') return product.price.currency;
    if (key === 'amountPaid') return expectedAmount;
    if (key === 'couponCode') return promoCode.codeName;
    return null;
  });
});

describe('Testing Impact Service', () => {
  describe('savePaymentDataInLocalStorage', () => {
    it('should save the correct amount to localStorage after applying coupon', () => {
      const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');

      savePaymentDataInLocalStorage(subId, paymentIntentId, product as PriceWithTax, 1, promoCode);

      expect(setToLocalStorageSpy).toHaveBeenCalledWith('amountPaid', expectedAmount);
    });

    it('should save subscription ID when plan is not lifetime', () => {
      const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');

      savePaymentDataInLocalStorage(subId, undefined, product as PriceWithTax, 1, promoCode);

      expect(setToLocalStorageSpy).toHaveBeenCalledWith('subscriptionId', subId);
    });

    it('should save payment intent ID when plan is lifetime', () => {
      const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');
      const lifetimeProduct = {
        ...product,
        price: { ...product.price, interval: 'lifetime' },
      };

      savePaymentDataInLocalStorage(undefined, paymentIntentId, lifetimeProduct as PriceWithTax, 1, promoCode);

      expect(setToLocalStorageSpy).toHaveBeenCalledWith('paymentIntentId', paymentIntentId);
    });

    it('should save product metadata including name, price ID, and currency', () => {
      const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');

      savePaymentDataInLocalStorage(subId, paymentIntentId, product as PriceWithTax, 1, promoCode);

      expect(setToLocalStorageSpy).toHaveBeenCalledWith('productName', planName);
      expect(setToLocalStorageSpy).toHaveBeenCalledWith('priceId', product.price.id);
      expect(setToLocalStorageSpy).toHaveBeenCalledWith('currency', product.price.currency);
    });

    it('should save coupon code when provided', () => {
      const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');

      savePaymentDataInLocalStorage(subId, paymentIntentId, product as PriceWithTax, 1, promoCode);

      expect(setToLocalStorageSpy).toHaveBeenCalledWith('couponCode', promoCode.codeName);
    });
  });

  describe('trackSignUp', () => {
    describe('gtag tracking', () => {
      it('should send User Signup event to gtag', async () => {
        const gTagSpy = vi.spyOn(globalThis.window, 'gtag');

        await trackSignUp(mockedUserUuid);

        expect(gTagSpy).toHaveBeenCalledWith('event', 'User Signup');
      });

      it('should report error when gtag fails but continue execution', async () => {
        const unknownError = new Error('gtag Error');
        const gTagSpy = vi.spyOn(globalThis.window, 'gtag').mockImplementation(() => {
          throw unknownError;
        });
        const reportErrorSpy = vi.spyOn(errorService, 'reportError');

        await expect(trackSignUp(mockedUserUuid)).resolves.not.toThrow();

        expect(gTagSpy).toHaveBeenCalledWith('event', 'User Signup');
        expect(reportErrorSpy).toHaveBeenCalledWith(unknownError);
      });
    });

    describe('Impact API tracking', () => {
      it('should send signup event to Impact API with correct payload', async () => {
        const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

        await trackSignUp(mockedUserUuid);

        expect(axiosSpy).toHaveBeenCalledTimes(1);
        expect(axiosSpy).toHaveBeenCalledWith(
          mockImpactApiUrl,
          expect.objectContaining({
            anonymousId: 'anon_id',
            timestamp: expect.any(String),
            userId: mockedUserUuid,
            type: 'track',
            event: 'User Signup',
          }),
        );
      });

      it('should include message ID in Impact API payload', async () => {
        const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

        await trackSignUp(mockedUserUuid);

        const callArgs = axiosSpy.mock.calls[0][1];
        expect(callArgs).toHaveProperty('messageId');
        expect(callArgs.messageId).toBe(mockedUserUuid);
      });

      it('should not send to Impact API when source is direct', async () => {
        const getCookieMock = await import('./utils');
        vi.mocked(getCookieMock.getCookie).mockImplementation((key) => {
          if (key === 'impactSource') return 'direct';
          if (key === 'impactAnonymousId') return 'anon_id';
          return '';
        });
        const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

        await trackSignUp(mockedUserUuid);

        expect(axiosSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('trackPaymentConversion', () => {
    describe('Impact API tracking', () => {
      it('should send payment conversion to Impact API with correct data', async () => {
        const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

        await trackPaymentConversion();

        expect(axiosSpy).toHaveBeenCalledTimes(1);
        expect(axiosSpy).toHaveBeenCalledWith(
          mockImpactApiUrl,
          expect.objectContaining({
            anonymousId: 'anon_id',
            timestamp: expect.any(String),
            properties: expect.objectContaining({
              impact_value: parseFloat(expectedAmount),
              subscription_id: subId,
              payment_intent: paymentIntentId,
              order_promo_code: promoCode.codeName,
            }),
            userId: mockedUserUuid,
            type: 'track',
            event: 'Payment Conversion',
          }),
        );
      });

      it('should use minimum value of 0.01 when amount is 0 (free purchase)', async () => {
        vi.spyOn(localStorageService, 'get').mockImplementation((key) => {
          if (key === 'amountPaid') return '0';
          if (key === 'subscriptionId') return subId;
          if (key === 'couponCode') return promoCode.codeName;
          return null;
        });
        const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

        await trackPaymentConversion();

        const callArgs = axiosSpy.mock.calls[0][1];
        expect(callArgs.properties.impact_value).toBe(0.01);
      });

      it('should include coupon code in properties when available', async () => {
        const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

        await trackPaymentConversion();

        const callArgs = axiosSpy.mock.calls[0][1];
        expect(callArgs.properties).toHaveProperty('order_promo_code', promoCode.codeName);
      });

      it('should report error when Impact API call fails', async () => {
        const unknownError = new Error('API Error');
        const axiosSpy = vi.spyOn(axios, 'post').mockRejectedValue(unknownError);
        const errorServiceSpy = vi.spyOn(errorService, 'reportError');

        await trackPaymentConversion();

        expect(axiosSpy).toHaveBeenCalledTimes(1);
        expect(errorServiceSpy).toHaveBeenCalledWith(unknownError);
      });

      it('should not send to Impact when source is direct and no coupon code', async () => {
        const getCookieMock = await import('./utils');
        vi.mocked(getCookieMock.getCookie).mockImplementation((key) => {
          if (key === 'impactSource') return 'direct';
          return '';
        });
        vi.spyOn(localStorageService, 'get').mockImplementation((key) => {
          if (key === 'couponCode') return null;
          if (key === 'amountPaid') return expectedAmount;
          return null;
        });
        const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

        await trackPaymentConversion();

        expect(axiosSpy).not.toHaveBeenCalled();
      });
    });

    describe('Error handling', () => {
      it('should handle missing user settings gracefully', async () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(localStorageService, 'getUser').mockReturnValue(null);

        await expect(trackPaymentConversion()).resolves.not.toThrow();

        consoleWarnSpy.mockRestore();
      });

      it('should continue execution when gtag is not available', async () => {
        globalThis.window.gtag = undefined as any;

        await expect(trackPaymentConversion()).resolves.not.toThrow();
      });

      it('should handle errors in entire function gracefully', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(localStorageService, 'getUser').mockImplementation(() => {
          throw new Error('Storage Error');
        });

        await expect(trackPaymentConversion()).resolves.not.toThrow();

        consoleErrorSpy.mockRestore();
      });
    });
  });
});
