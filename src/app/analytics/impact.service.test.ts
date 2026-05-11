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
    if (key === 'isFirstPurchase') return 'true';
    return null;
  });
});

describe('Testing Impact Service', () => {
  describe('savePaymentDataInLocalStorage', () => {
    it('When coupon is applied, then it should save the correct amount to localStorage', () => {
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

    it('When plan is not lifetime, then it should save subscription ID', () => {
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

    it('When plan is lifetime, then it should save payment intent ID', () => {
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

    it('When saving payment data, then it should save product metadata including name, price ID, and currency', () => {
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

    it('When coupon code is provided, then it should save coupon code', () => {
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

    it('When saving payment data, then it should save isFirstPurchase flag to localStorage', () => {
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
      it('When tracking sign up, then it should send User Signup event to gtag', async () => {
        const gTagSpy = vi.spyOn(globalThis.window, 'gtag');

        await trackSignUp(mockedUserUuid);

        expect(gTagSpy).toHaveBeenCalledWith('event', 'User Signup');
      });

      it('When gtag fails, then it should report error but continue execution', async () => {
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
      it('When tracking sign up, then it should send signup event to Impact API with correct payload', async () => {
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

      it('When tracking sign up, then it should include message ID in Impact API payload', async () => {
        const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

        await trackSignUp(mockedUserUuid);

        const callArgs = axiosSpy.mock.calls[0][1] as { messageId: string };
        expect(callArgs).toHaveProperty('messageId');
        expect(callArgs.messageId).toBe(mockedUserUuid);
      });

      it('When source is direct, then it should not send to Impact API', async () => {
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
      it('When tracking payment conversion, then it should send payment conversion to Impact API with correct data', async () => {
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

      it('When amount is 0 (free purchase), then it should use minimum value of 0.01', async () => {
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

      it('When coupon code is available, then it should include coupon code in properties', async () => {
        const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

        await trackPaymentConversion();

        const callArgs = axiosSpy.mock.calls[0][1] as { messageId: string; properties: Record<string, unknown> };
        expect(callArgs.properties).toHaveProperty('order_promo_code', promoCode.codeName);
      });

      it('When Impact API call fails, then it should report error', async () => {
        const unknownError = new Error('API Error');
        const axiosSpy = vi.spyOn(axios, 'post').mockRejectedValue(unknownError);
        const errorServiceSpy = vi.spyOn(errorService, 'reportError');

        await trackPaymentConversion();

        expect(axiosSpy).toHaveBeenCalledTimes(1);
        expect(errorServiceSpy).toHaveBeenCalledWith(unknownError);
      });

      it('When source is direct and no coupon code, then it should not send to Impact', async () => {
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

      it('When isFirstPurchase is false, then it should not send to Impact', async () => {
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
      it('When user settings are missing, then it should handle them gracefully', async () => {
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(localStorageService, 'getUser').mockReturnValue(null);

        await expect(trackPaymentConversion()).resolves.not.toThrow();

        consoleWarnSpy.mockRestore();
      });

      it('When gtag is not available, then it should continue execution', async () => {
        globalThis.window.gtag = undefined as any;

        await expect(trackPaymentConversion()).resolves.not.toThrow();
      });

      it('When an error occurs in the entire function, then it should handle it gracefully', async () => {
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
  it('When calling v4, then it should generate a valid UUID', async () => {
    const { v4 } = await vi.importActual<typeof import('uuid')>('uuid');
    const id = v4();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});
