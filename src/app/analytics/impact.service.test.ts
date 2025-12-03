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
    return '';
  }),
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
    else return 'no mock implementation';
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
    else return 'mock underfined';
  });
});

describe('Testing Impact Service', () => {
  describe('Store necessary data to track it later', () => {
    it('When wants to store the data, then the price to track is the correct one', () => {
      const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');

      savePaymentDataInLocalStorage(subId, paymentIntentId, product as PriceWithTax, 1, promoCode);

      expect(setToLocalStorageSpy).toHaveBeenCalledWith('amountPaid', expectedAmount);
    });
  });

  describe('Tracking sign up event', () => {
    describe('G Tag event', () => {
      it('When the G Tag event is triggered, then the event is sent', async () => {
        const gTagSpy = vi.spyOn(globalThis.window, 'gtag');

        await trackSignUp(mockedUserUuid);

        expect(gTagSpy).toHaveBeenCalled();
        expect(gTagSpy).toHaveBeenCalledWith('event', 'User Signup');
      });

      it('When the G Tag event is triggered and fails, then the error should be reported', async () => {
        const unknownError = new Error('Unknown Error');
        const gTagSpy = vi.spyOn(globalThis.window, 'gtag').mockImplementation(() => {
          throw unknownError;
        });
        const reportErrorSpy = vi.spyOn(errorService, 'reportError');

        await trackSignUp(mockedUserUuid);

        expect(gTagSpy).toHaveBeenCalled();
        expect(gTagSpy).toHaveBeenCalledWith('event', 'User Signup');
        expect(reportErrorSpy).toHaveBeenCalled();
        expect(reportErrorSpy).toHaveBeenCalledWith(unknownError);
      });
    });

    describe('Impact event', () => {
      it('When the Sign Up event is triggered, then the event is sent with the correct data', async () => {
        const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});
        vi.spyOn(localStorageService, 'getUser').mockReturnValue({
          uuid: mockedUserUuid,
        } as unknown as UserSettings);

        await trackSignUp(mockedUserUuid);

        expect(axiosSpy).toHaveBeenCalledTimes(1);

        const callArgs = axiosSpy.mock.calls[0][1];
        expect(callArgs).toMatchObject({
          anonymousId: 'anon_id',
          timestamp: dayjs().format('YYYY-MM-DDTHH:mm:ss.sssZ'),
          userId: mockedUserUuid,
          type: 'track',
          event: 'User Signup',
        });
      });
    });
  });

  describe('Tracking a payment conversion', () => {
    describe('G Tag event', () => {
      it('When the gtag event is successfully triggered, then it should have the correct data', async () => {
        const gTagSpy = vi.spyOn(globalThis.window, 'gtag');

        await trackPaymentConversion();

        expect(gTagSpy).toHaveBeenCalled();
        expect(gTagSpy).toHaveBeenCalledWith('event', 'purchase', {
          transaction_id: mockedUserUuid,
          value: parseFloat(expectedAmount),
          currency: product.price.currency?.toUpperCase() ?? '€',
          items: [
            {
              item_id: product.price.id,
              item_name: planName,
              quantity: 1,
              price: parseFloat(expectedAmount),
            },
          ],
        });
      });

      it('When an error occurs while triggering the gtag event, then the function should be continue', async () => {
        const unknownError = new Error('Unknown Error');
        const gTagSpy = vi.spyOn(globalThis.window, 'gtag').mockImplementation(() => {
          throw unknownError;
        });

        await trackPaymentConversion();

        expect(gTagSpy).toHaveBeenCalled();
        expect(gTagSpy).toHaveBeenCalledWith('event', 'purchase', {
          transaction_id: mockedUserUuid,
          value: parseFloat(expectedAmount),
          currency: product.price.currency?.toUpperCase() ?? '€',
          items: [
            {
              item_id: product.price.id,
              item_name: planName,
              quantity: 1,
              price: parseFloat(expectedAmount),
            },
          ],
        });

        await expect(trackPaymentConversion()).resolves.not.toThrow();
      });
    });

    describe('Impact event', () => {
      it('When the Impact event is triggered, then the necessary data is sent', async () => {
        const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});
        vi.spyOn(localStorageService, 'getUser').mockReturnValue({
          uuid: mockedUserUuid,
        } as unknown as UserSettings);

        await trackPaymentConversion();

        expect(axiosSpy).toHaveBeenCalledTimes(1);

        const callArgs = axiosSpy.mock.calls[0][1];
        expect(callArgs).toMatchObject({
          anonymousId: 'anon_id',
          properties: {
            impact_value: parseFloat(expectedAmount),
            subscription_id: subId,
          },
          userId: mockedUserUuid,
          type: 'track',
          event: 'Payment Conversion',
        });
      });

      it('When the Impact event fails, then the error should be reported', async () => {
        const unknownError = new Error('Unknown Error');
        const axiosSpy = vi.spyOn(axios, 'post').mockRejectedValue(unknownError);
        const errorServiceSpy = vi.spyOn(errorService, 'reportError');
        vi.spyOn(localStorageService, 'getUser').mockReturnValue({
          uuid: 'user_uuid',
        } as unknown as UserSettings);

        await trackPaymentConversion();

        expect(axiosSpy).toHaveBeenCalledTimes(1);

        const callArgs = axiosSpy.mock.calls[0][1];
        expect(callArgs).toMatchObject({
          anonymousId: 'anon_id',
          properties: {
            impact_value: parseFloat(expectedAmount),
            subscription_id: subId,
          },
          userId: 'user_uuid',
          type: 'track',
          event: 'Payment Conversion',
        });
        expect(errorServiceSpy).toHaveBeenCalled();
        expect(errorServiceSpy).toHaveBeenCalledWith(unknownError);
      });
    });
  });
});
