import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { bytesToString } from 'app/drive/services/size.service';
import axios from 'axios';
import envService from 'services/env.service';
import errorService from 'services/error.service';
import localStorageService from 'services/local-storage.service';
import { getProductAmount } from 'views/Checkout/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { savePaymentDataInLocalStorage, trackPaymentConversion, trackSignUp } from './impact.service';

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
  codeName: 'CNINTERNXTL',
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
    if (key === 'isFirstPurchase') return 'true';
    return null;
  });
});

describe('Testing Impact Service', () => {
  describe('savePaymentDataInLocalStorage', () => {
    it('When a coupon is applied, then it saves the discounted amount to localStorage', () => {
      const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');

      savePaymentDataInLocalStorage({
        subscriptionId: subId,
        paymentIntentId,
        selectedPlan: product as PriceWithTax,
        users: 1,
        couponCodeData: promoCode,
        isFirstPurchase: true,
      });

      expect(setToLocalStorageSpy).toHaveBeenCalledWith('amountPaid', expectedAmount);
    });

    it('When the plan is not lifetime, then it saves the subscription ID to localStorage', () => {
      const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');

      savePaymentDataInLocalStorage({
        subscriptionId: subId,
        paymentIntentId: undefined,
        selectedPlan: product as PriceWithTax,
        users: 1,
        couponCodeData: promoCode,
        isFirstPurchase: true,
      });

      expect(setToLocalStorageSpy).toHaveBeenCalledWith('subscriptionId', subId);
    });

    it('When the plan is lifetime, then it saves the payment intent ID to localStorage', () => {
      const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');
      const lifetimeProduct = {
        ...product,
        price: { ...product.price, interval: 'lifetime' },
      };

      savePaymentDataInLocalStorage({
        subscriptionId: undefined,
        paymentIntentId,
        selectedPlan: lifetimeProduct as PriceWithTax,
        users: 1,
        couponCodeData: promoCode,
        isFirstPurchase: true,
      });

      expect(setToLocalStorageSpy).toHaveBeenCalledWith('paymentIntentId', paymentIntentId);
    });

    it('When saving payment data, then it saves the product name, price ID, and currency to localStorage', () => {
      const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');

      savePaymentDataInLocalStorage({
        subscriptionId: subId,
        paymentIntentId,
        selectedPlan: product as PriceWithTax,
        users: 1,
        couponCodeData: promoCode,
        isFirstPurchase: true,
      });

      expect(setToLocalStorageSpy).toHaveBeenCalledWith('productName', planName);
      expect(setToLocalStorageSpy).toHaveBeenCalledWith('priceId', product.price.id);
      expect(setToLocalStorageSpy).toHaveBeenCalledWith('currency', product.price.currency);
    });

    it('When a coupon code is provided, then it saves the coupon code to localStorage', () => {
      const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');

      savePaymentDataInLocalStorage({
        subscriptionId: subId,
        paymentIntentId,
        selectedPlan: product as PriceWithTax,
        users: 1,
        couponCodeData: promoCode,
        isFirstPurchase: true,
      });

      expect(setToLocalStorageSpy).toHaveBeenCalledWith('couponCode', promoCode.codeName);
    });

    it('When saving payment data, then it saves the isFirstPurchase flag to localStorage', () => {
      const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');

      savePaymentDataInLocalStorage({
        subscriptionId: subId,
        paymentIntentId,
        selectedPlan: product as PriceWithTax,
        users: 1,
        couponCodeData: promoCode,
        isFirstPurchase: true,
      });

      expect(setToLocalStorageSpy).toHaveBeenCalledWith('isFirstPurchase', 'true');
    });
  });

  describe('trackSignUp', () => {
    describe('gtag tracking', () => {
      it('When trackSignUp is called, then it sends a User Signup event to gtag', async () => {
        const gTagSpy = vi.spyOn(globalThis.window, 'gtag');

        await trackSignUp(mockedUserUuid);

        expect(gTagSpy).toHaveBeenCalledWith('event', 'User Signup');
      });

      it('When gtag throws an error, then it reports the error and continues execution', async () => {
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
      it('When trackSignUp is called, then it sends a signup event to the Impact API with the correct payload', async () => {
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

      it('When trackSignUp is called, then it includes the message ID in the Impact API payload', async () => {
        const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

        await trackSignUp(mockedUserUuid);

        const callArgs = axiosSpy.mock.calls[0][1] as { messageId: string };
        expect(callArgs).toHaveProperty('messageId');
        expect(callArgs.messageId).toBe(mockedUserUuid);
      });

      it('When the source is direct, then it does not send to the Impact API', async () => {
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
      it('When trackPaymentConversion is called, then it sends the conversion to the Impact API with the correct data', async () => {
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

      it('When the amount paid is 0, then it uses 0.01 as the minimum impact value', async () => {
        vi.spyOn(localStorageService, 'get').mockImplementation((key) => {
          if (key === 'amountPaid') return '0';
          if (key === 'subscriptionId') return subId;
          if (key === 'couponCode') return promoCode.codeName;
          if (key === 'isFirstPurchase') return 'true';
          return null;
        });
        const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

        await trackPaymentConversion();

        const callArgs = axiosSpy.mock.calls[0][1] as { messageId: string; properties: Record<string, unknown> };
        expect(callArgs.properties.impact_value).toBe(0.01);
      });

      it('When a coupon code is available, then it includes it in the Impact API properties', async () => {
        const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

        await trackPaymentConversion();

        const callArgs = axiosSpy.mock.calls[0][1] as { messageId: string; properties: Record<string, unknown> };
        expect(callArgs.properties).toHaveProperty('order_promo_code', promoCode.codeName);
      });

      it('When the Impact API call fails, then it reports the error', async () => {
        const unknownError = new Error('API Error');
        const axiosSpy = vi.spyOn(axios, 'post').mockRejectedValue(unknownError);
        const errorServiceSpy = vi.spyOn(errorService, 'reportError');

        await trackPaymentConversion();

        expect(axiosSpy).toHaveBeenCalledTimes(1);
        expect(errorServiceSpy).toHaveBeenCalledWith(unknownError);
      });

      it('When the source is direct and no coupon code is present, then it does not send to Impact', async () => {
        const getCookieMock = await import('./utils');
        vi.mocked(getCookieMock.getCookie).mockImplementation((key) => {
          if (key === 'impactSource') return 'direct';
          return '';
        });
        vi.spyOn(localStorageService, 'get').mockImplementation((key) => {
          if (key === 'couponCode') return null;
          if (key === 'amountPaid') return expectedAmount;
          if (key === 'isFirstPurchase') return 'true';
          return null;
        });
        const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

        await trackPaymentConversion();

        expect(axiosSpy).not.toHaveBeenCalled();
      });

      it('When the source is direct and the coupon code is not whitelisted, then it does not send to Impact', async () => {
        const getCookieMock = await import('./utils');
        vi.mocked(getCookieMock.getCookie).mockImplementation((key) => {
          if (key === 'impactSource') return 'direct';
          return '';
        });
        vi.spyOn(localStorageService, 'get').mockImplementation((key) => {
          if (key === 'couponCode') return 'NOT_WHITELISTED';
          if (key === 'amountPaid') return expectedAmount;
          if (key === 'isFirstPurchase') return 'true';
          return null;
        });
        const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

        await trackPaymentConversion();

        expect(axiosSpy).not.toHaveBeenCalled();
      });

      it('When the source is direct but the coupon code is whitelisted, then it sends to Impact', async () => {
        const getCookieMock = await import('./utils');
        vi.mocked(getCookieMock.getCookie).mockImplementation((key) => {
          if (key === 'impactSource') return 'direct';
          if (key === 'impactAnonymousId') return ''; // Empty, so it uses uuidV4
          return '';
        });
        vi.spyOn(localStorageService, 'get').mockImplementation((key) => {
          if (key === 'couponCode') return 'CNINTERNXT'; // In whitelist
          if (key === 'amountPaid') return expectedAmount;
          if (key === 'subscriptionId') return subId;
          if (key === 'isFirstPurchase') return 'true';
          return null;
        });
        const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

        await trackPaymentConversion();

        expect(axiosSpy).toHaveBeenCalledTimes(1);
        const callArgs = axiosSpy.mock.calls[0][1] as { properties: Record<string, unknown>; anonymousId: string };
        expect(callArgs.properties).toHaveProperty('order_promo_code', 'CNINTERNXT');
        expect(callArgs.anonymousId).toBe(mockedUserUuid); // Fallback to uuidV4
      });

      it('When isFirstPurchase is false, then it does not send to Impact', async () => {
        vi.spyOn(localStorageService, 'get').mockImplementation((key) => {
          if (key === 'isFirstPurchase') return 'false';
          if (key === 'amountPaid') return expectedAmount;
          if (key === 'couponCode') return promoCode.codeName;
          return null;
        });
        const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

        await trackPaymentConversion();

        expect(axiosSpy).not.toHaveBeenCalled();
      });
    });

    describe('Error handling', () => {
      it('When user settings are missing, then it resolves without throwing', async () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(localStorageService, 'getUser').mockReturnValue(null);

        await expect(trackPaymentConversion()).resolves.not.toThrow();

        consoleWarnSpy.mockRestore();
      });

      it('When gtag is not available, then it continues execution without throwing', async () => {
        globalThis.window.gtag = undefined as any;

        await expect(trackPaymentConversion()).resolves.not.toThrow();
      });

      it('When an unexpected error occurs, then it resolves without throwing', async () => {
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
