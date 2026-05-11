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
    it('When a coupon is applied, then the discounted amount is stored for conversion tracking', () => {
      const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');

      savePaymentDataInLocalStorage({
        paymentIntentId,
        selectedPlan: product as PriceWithTax,
        users: 1,
        couponCodeData: promoCode,
        isFirstPurchase: true,
      });

      expect(setToLocalStorageSpy).toHaveBeenCalledWith('amountPaid', expectedAmount);
    });

    it('When a payment intent is provided, then the payment reference is stored for tracking', () => {
      const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');

      savePaymentDataInLocalStorage({
        paymentIntentId,
        selectedPlan: product as PriceWithTax,
        users: 1,
        couponCodeData: promoCode,
        isFirstPurchase: true,
      });

      expect(setToLocalStorageSpy).toHaveBeenCalledWith('paymentIntentId', paymentIntentId);
    });

    it('When payment data is saved, then the plan name, price, and currency are all stored', () => {
      const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');

      savePaymentDataInLocalStorage({
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

    it('When a coupon code is used, then it is stored alongside the payment data', () => {
      const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');

      savePaymentDataInLocalStorage({
        paymentIntentId,
        selectedPlan: product as PriceWithTax,
        users: 1,
        couponCodeData: promoCode,
        isFirstPurchase: true,
      });

      expect(setToLocalStorageSpy).toHaveBeenCalledWith('couponCode', promoCode.codeName);
    });

    it('When payment data is saved, then whether it is the first purchase is also stored', () => {
      const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');

      savePaymentDataInLocalStorage({
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
      it('When a user signs up, then the registration is reported to Google Analytics', async () => {
        const gTagSpy = vi.spyOn(globalThis.window, 'gtag');

        await trackSignUp(mockedUserUuid);

        expect(gTagSpy).toHaveBeenCalledWith('event', 'User Signup');
      });

      it('When Google Analytics fails, then the error is logged and sign-up tracking continues', async () => {
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
      it('When trackSignUp is called, then it sends signup event to Impact API with correct payload', async () => {
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

      it('When trackSignUp is called, then it includes message ID in Impact API payload', async () => {
        const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

        await trackSignUp(mockedUserUuid);

        const callArgs = axiosSpy.mock.calls[0][1] as { messageId: string };
        expect(callArgs).toHaveProperty('messageId');
        expect(callArgs.messageId).toBe(mockedUserUuid);
      });

      it('When source is direct, then it does not send to Impact API', async () => {
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
      it('When a payment is completed, then the full order details are reported to Impact', async () => {
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
              payment_intent: paymentIntentId,
              order_promo_code: promoCode.codeName,
            }),
            userId: mockedUserUuid,
            type: 'track',
            event: 'Payment Conversion',
          }),
        );
      });

      it('When the purchase is free, then the minimum trackable amount is used in the conversion report', async () => {
        vi.spyOn(localStorageService, 'get').mockImplementation((key) => {
          if (key === 'amountPaid') return '0';
          if (key === 'couponCode') return promoCode.codeName;
          if (key === 'isFirstPurchase') return 'true';
          return null;
        });
        const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

        await trackPaymentConversion();

        const callArgs = axiosSpy.mock.calls[0][1] as { messageId: string; properties: Record<string, unknown> };
        expect(callArgs.properties.impact_value).toBe(0.01);
      });

      it('When a promo code was used, then it appears in the conversion data reported to Impact', async () => {
        const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

        await trackPaymentConversion();

        const callArgs = axiosSpy.mock.calls[0][1] as { messageId: string; properties: Record<string, unknown> };
        expect(callArgs.properties).toHaveProperty('order_promo_code', promoCode.codeName);
      });

      it('When reporting to Impact fails, then the error is logged', async () => {
        const unknownError = new Error('API Error');
        const axiosSpy = vi.spyOn(axios, 'post').mockRejectedValue(unknownError);
        const errorServiceSpy = vi.spyOn(errorService, 'reportError');

        await trackPaymentConversion();

        expect(axiosSpy).toHaveBeenCalledTimes(1);
        expect(errorServiceSpy).toHaveBeenCalledWith(unknownError);
      });

      it('When the traffic source is direct and no promo code was used, then the conversion is not sent to Impact', async () => {
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

      it('When the traffic source is direct but a promo code was used, then the conversion is still sent to Impact', async () => {
        const getCookieMock = await import('./utils');
        vi.mocked(getCookieMock.getCookie).mockImplementation((key) => {
          if (key === 'impactSource') return 'direct';
          if (key === 'impactAnonymousId') return '';
          return '';
        });
        vi.spyOn(localStorageService, 'get').mockImplementation((key) => {
          if (key === 'couponCode') return 'CNINTERNXT';
          if (key === 'amountPaid') return expectedAmount;
          if (key === 'isFirstPurchase') return 'true';
          return null;
        });
        const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

        await trackPaymentConversion();

        expect(axiosSpy).toHaveBeenCalledTimes(1);
        const callArgs = axiosSpy.mock.calls[0][1] as { properties: Record<string, unknown>; anonymousId: string };
        expect(callArgs.properties).toHaveProperty('order_promo_code', 'CNINTERNXT');
        expect(callArgs.anonymousId).toBe('');
      });

      it('When the purchase is not the first, then it is not reported as a conversion to Impact', async () => {
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
      it('When the user profile is not available, then conversion tracking completes without crashing', async () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(localStorageService, 'getUser').mockReturnValue(null);

        await expect(trackPaymentConversion()).resolves.not.toThrow();

        consoleWarnSpy.mockRestore();
      });

      it('When Google Analytics is not loaded, then the rest of conversion tracking still runs', async () => {
        globalThis.window.gtag = undefined as any;

        await expect(trackPaymentConversion()).resolves.not.toThrow();
      });

      it('When an unexpected error occurs, then conversion tracking fails silently without crashing', async () => {
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

describe('uuid library', () => {
  it('When a UUID is generated, then it follows the expected UUID v4 format', async () => {
    const { v4 } = await vi.importActual<typeof import('uuid')>('uuid');
    const id = v4();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});
