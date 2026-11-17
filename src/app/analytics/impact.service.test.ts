import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { bytesToString } from 'app/drive/services/size.service';
import axios from 'axios';
import envService from 'services/env.service';
import errorService from 'services/error.service';
import localStorageService from 'services/local-storage.service';
import { getProductAmount } from 'views/Checkout/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { sendAddShoppersConversion } from './addShoppers.services';
import {
  handleImpactDTCCheckout,
  savePaymentDataInLocalStorage,
  trackPaymentConversion,
  trackSignUp,
} from './impact.service';
import { getCookie, setImpactCookies } from './utils';

vi.mock('services/local-storage.service', () => ({
  default: {
    get: vi.fn(),
    clear: vi.fn(),
    set: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock('uuid', () => ({
  v4: vi.fn(() => mockedUserUuid),
}));

vi.mock('./utils', () => ({
  getCookie: vi.fn(),
  setImpactCookies: vi.fn(),
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

type ImpactPayload = {
  anonymousId: string;
  userId: string;
  messageId: string;
  gclid?: string;
  properties: Record<string, unknown>;
  context: Record<string, unknown>;
};
type SavePaymentData = Parameters<typeof savePaymentDataInLocalStorage>[0];

const subId = 'sub_123';
const paymentIntentId = 'py_123';
const mockedUserUuid = '00000000-0000-0000-0000-0000000000';
const mockImpactApiUrl = 'mock-impact-api-url';
const customerId = 'cus_123';
const buyer = { id: mockedUserUuid, email: 'usuario@ejemplo.com' };
const irclickid = 'TZr0kB1hUxyZWqOxHoVulWsMUkuRX82pgw77Sk0';
const utmMedium = '312695';

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
const lifetimeProduct = { ...product, price: { ...product.price, interval: 'lifetime' } } as PriceWithTax;

const expectedAmount = getProductAmount(product.price.decimalAmount, 1, promoCode);
const planName = bytesToString(product.price.bytes) + product.price.interval;

const defaultCookies = { impactAnonymousId: 'anon_id', impactSource: 'ads' };
const defaultStorage = {
  paymentIntentId,
  subscriptionId: subId,
  productName: planName,
  priceId: product.price.id,
  currency: product.price.currency,
  amountPaid: expectedAmount,
  couponCode: promoCode.codeName,
  isFirstPurchase: 'true',
};

const mockCookies = (cookies: Record<string, string>) =>
  vi.mocked(getCookie).mockImplementation((key) => cookies[key] ?? '');
const mockStorage = (values: Record<string, string | null>) =>
  vi.spyOn(localStorageService, 'get').mockImplementation((key) => values[key] ?? null);
const savePayment = (overrides: Partial<SavePaymentData> = {}) =>
  savePaymentDataInLocalStorage({
    subscriptionId: subId,
    paymentIntentId,
    selectedPlan: product as PriceWithTax,
    users: 1,
    couponCodeData: promoCode,
    isFirstPurchase: true,
    customerId,
    ...overrides,
  });

let axiosSpy: ReturnType<typeof vi.spyOn>;
const postedPayload = () => axiosSpy.mock.calls[0][1] as ImpactPayload;

beforeEach(() => {
  globalThis.window.gtag = vi.fn();
  vi.clearAllMocks();

  axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});
  vi.spyOn(envService, 'getVariable').mockImplementation((key) =>
    key === 'impactApiUrl' ? mockImpactApiUrl : 'no mock implementation',
  );
  mockCookies(defaultCookies);
  mockStorage(defaultStorage);
});

describe('Testing Impact Service', () => {
  describe('savePaymentDataInLocalStorage', () => {
    it.each([
      { when: 'a coupon is applied', overrides: {}, key: 'amountPaid', value: expectedAmount },
      {
        when: 'the plan is not lifetime',
        overrides: { paymentIntentId: undefined },
        key: 'subscriptionId',
        value: subId,
      },
      {
        when: 'the plan is lifetime',
        overrides: { subscriptionId: undefined, selectedPlan: lifetimeProduct },
        key: 'paymentIntentId',
        value: paymentIntentId,
      },
      { when: 'saving payment data', overrides: {}, key: 'productName', value: planName },
      { when: 'saving payment data', overrides: {}, key: 'priceId', value: product.price.id },
      { when: 'saving payment data', overrides: {}, key: 'currency', value: product.price.currency },
      { when: 'a coupon code is provided', overrides: {}, key: 'couponCode', value: promoCode.codeName },
      { when: 'saving payment data', overrides: {}, key: 'isFirstPurchase', value: 'true' },
      {
        when: 'this is a returning customer',
        overrides: { isFirstPurchase: false },
        key: 'isFirstPurchase',
        value: 'false',
      },
      { when: 'saving payment data', overrides: {}, key: 'checkout_customer_id', value: customerId },
    ])('When $when, then it saves $key to localStorage', ({ overrides, key, value }) => {
      savePayment(overrides);

      expect(localStorageService.set).toHaveBeenCalledWith(key, value);
    });

    it.each([
      {
        when: 'no plan has been selected',
        overrides: { selectedPlan: undefined },
        keys: ['productName', 'amountPaid', 'priceId', 'currency'],
      },
      {
        when: 'a discount code has no identifier',
        overrides: { couponCodeData: { ...promoCode, codeName: '' } },
        keys: ['couponCode'],
      },
      { when: 'no discount code is provided', overrides: { couponCodeData: undefined }, keys: ['couponCode'] },
      {
        when: 'the user buys a lifetime plan',
        overrides: { selectedPlan: lifetimeProduct },
        keys: ['subscriptionId'],
      },
      { when: 'the user buys a subscription plan', overrides: {}, keys: ['paymentIntentId'] },
    ])('When $when, then it does not save $keys to localStorage', ({ overrides, keys }) => {
      savePayment(overrides);

      keys.forEach((key) => expect(localStorageService.set).not.toHaveBeenCalledWith(key, expect.anything()));
    });

    it('When the user comes from Impact, then it keeps the source so a later conversion is still attributed', () => {
      vi.mocked(getCookie).mockImplementationOnce((key) => (key === 'impactSource' ? 'Impact' : ''));

      savePayment();

      expect(localStorageService.set).toHaveBeenCalledWith('impact_source', 'Impact');
    });

    it('When the user does not come from Impact, then it drops any source kept from an earlier purchase', () => {
      vi.mocked(getCookie).mockImplementationOnce(() => '');

      savePayment();

      expect(localStorageService.set).not.toHaveBeenCalledWith('impact_source', expect.anything());
      expect(localStorageService.removeItem).toHaveBeenCalledWith('impact_source');
    });
  });

  describe('trackSignUp', () => {
    describe('gtag tracking', () => {
      it('When trackSignUp is called, then it sends a User Signup event to gtag', async () => {
        await trackSignUp(mockedUserUuid);

        expect(globalThis.window.gtag).toHaveBeenCalledWith('event', 'User Signup');
      });

      it('When gtag throws an error, then it reports the error and continues execution', async () => {
        const unknownError = new Error('gtag Error');
        vi.spyOn(globalThis.window, 'gtag').mockImplementation(() => {
          throw unknownError;
        });

        await expect(trackSignUp(mockedUserUuid)).resolves.not.toThrow();

        expect(globalThis.window.gtag).toHaveBeenCalledWith('event', 'User Signup');
        expect(errorService.reportError).toHaveBeenCalledWith(unknownError);
      });
    });

    describe('Impact API tracking', () => {
      it('When trackSignUp is called, then it sends a signup event to the Impact API with the correct payload', async () => {
        await trackSignUp(mockedUserUuid);

        expect(axiosSpy).toHaveBeenCalledTimes(1);
        expect(axiosSpy).toHaveBeenCalledWith(
          mockImpactApiUrl,
          expect.objectContaining({
            anonymousId: 'anon_id',
            timestamp: expect.any(String),
            userId: mockedUserUuid,
            messageId: mockedUserUuid,
            type: 'track',
            event: 'User Signup',
          }),
        );
      });

      it.each(['direct', ''])('When the source is "%s", then it does not send to the Impact API', async (source) => {
        mockCookies({ impactSource: source, impactAnonymousId: 'anon_id' });

        await trackSignUp(mockedUserUuid);

        expect(axiosSpy).not.toHaveBeenCalled();
      });

      it('When the user arrived via a Google ad, then their ad click identifier is included in the signup event', async () => {
        mockCookies({ ...defaultCookies, gclid: 'test_gclid_123' });

        await trackSignUp(mockedUserUuid);

        expect(postedPayload()).toHaveProperty('gclid', 'test_gclid_123');
      });

      it('When the user did not arrive via a Google ad, then no ad click identifier is included in the signup event', async () => {
        await trackSignUp(mockedUserUuid);

        expect(postedPayload()).not.toHaveProperty('gclid');
      });

      it('When Google Analytics is not available, then the signup event is still reported to Impact', async () => {
        globalThis.window.gtag = undefined as any;

        await trackSignUp(mockedUserUuid);

        expect(axiosSpy).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('trackPaymentConversion', () => {
    describe('Impact API tracking', () => {
      it('When trackPaymentConversion is called, then it sends the conversion to the Impact API with the correct data', async () => {
        await trackPaymentConversion(buyer);

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
        mockStorage({ ...defaultStorage, amountPaid: '0' });

        await trackPaymentConversion(buyer);

        expect(postedPayload().properties.impact_value).toBe(0.01);
      });

      it('When the Impact API call fails, then it reports the error', async () => {
        const unknownError = new Error('API Error');
        axiosSpy.mockRejectedValue(unknownError);

        await trackPaymentConversion(buyer);

        expect(axiosSpy).toHaveBeenCalledTimes(1);
        expect(errorService.reportError).toHaveBeenCalledWith(unknownError);
      });

      it.each([
        {
          when: 'the source is direct and no coupon code is present',
          cookies: { impactSource: 'direct' },
          storage: { couponCode: null },
        },
        {
          when: 'the source is direct and the coupon code is not whitelisted',
          cookies: { impactSource: 'direct' },
          storage: { couponCode: 'NOT_WHITELISTED' },
        },
        { when: 'isFirstPurchase is false', cookies: defaultCookies, storage: { isFirstPurchase: 'false' } },
      ])('When $when, then it does not send to Impact', async ({ cookies, storage }) => {
        mockCookies(cookies);
        mockStorage({ ...defaultStorage, ...storage });

        await trackPaymentConversion(buyer);

        expect(axiosSpy).not.toHaveBeenCalled();
      });

      it.each(['CNINTERNXT', 'CLOUDOFF', 'SPECIAL'])(
        'When the source is direct but the coupon code %s is whitelisted, then it sends to Impact',
        async (couponCode) => {
          mockCookies({ impactSource: 'direct', impactAnonymousId: '' });
          mockStorage({ ...defaultStorage, couponCode });

          await trackPaymentConversion(buyer);

          expect(axiosSpy).toHaveBeenCalledTimes(1);
          expect(postedPayload().properties).toHaveProperty('order_promo_code', couponCode);
          expect(postedPayload().anonymousId).toBe(mockedUserUuid);
        },
      );

      it('When the source cookie has expired but the purchase was made from Impact, then it still sends to Impact', async () => {
        mockCookies({ impactAnonymousId: 'anon_id' });
        mockStorage({ ...defaultStorage, impact_source: 'Impact', couponCode: null });

        await trackPaymentConversion(buyer);

        expect(axiosSpy).toHaveBeenCalledTimes(1);
        expect(postedPayload()).toEqual(
          expect.objectContaining({ anonymousId: 'anon_id', userId: mockedUserUuid, event: 'Payment Conversion' }),
        );
      });

      it('When the buyer has no account yet, then the conversion is sent with the Stripe customer', async () => {
        await trackPaymentConversion({ id: customerId, email: 'new.buyer@internxt.com' });

        expect(axiosSpy).toHaveBeenCalledTimes(1);
        expect(postedPayload()).toEqual(
          expect.objectContaining({ anonymousId: 'anon_id', userId: customerId, event: 'Payment Conversion' }),
        );
      });

      it('When no discount code was used, then the conversion is reported without a promo code', async () => {
        mockStorage({ ...defaultStorage, couponCode: null });

        await trackPaymentConversion(buyer);

        expect(axiosSpy).toHaveBeenCalledTimes(1);
        expect(postedPayload().properties).not.toHaveProperty('order_promo_code');
      });
    });

    describe('Error handling', () => {
      it('When gtag is not available, then it continues execution without throwing', async () => {
        globalThis.window.gtag = undefined as any;

        await expect(trackPaymentConversion(buyer)).resolves.not.toThrow();
      });

      it('When an unexpected error occurs, then it resolves without throwing', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(localStorageService, 'get').mockImplementation(() => {
          throw new Error('Storage Error');
        });

        await expect(trackPaymentConversion(buyer)).resolves.not.toThrow();
      });

      it('When the shopping affiliate tracker fails, then the error is handled gracefully and the Impact conversion is still reported', async () => {
        vi.mocked(sendAddShoppersConversion).mockImplementationOnce(() => {
          throw new Error('AddShoppers Error');
        });
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        await expect(trackPaymentConversion(buyer)).resolves.not.toThrow();

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          '[Impact Service] AddShoppers conversion failed:',
          expect.any(Error),
        );
        expect(axiosSpy).toHaveBeenCalledTimes(1);
      });
    });

    it('When a conversion is tracked, then the shopping affiliate is notified with the customer and purchase details', async () => {
      await trackPaymentConversion(buyer);

      expect(sendAddShoppersConversion).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: mockedUserUuid,
          email: 'usuario@ejemplo.com',
          currency: product.price.currency,
        }),
      );
    });
  });
});

describe('handleImpactDTCCheckout', () => {
  it('When tracking an affiliate click, then it reports the event to Impact analytics with the click identifier', async () => {
    await handleImpactDTCCheckout({ irclickid });

    expect(axiosSpy).toHaveBeenCalledTimes(1);
    expect(axiosSpy).toHaveBeenCalledWith(
      mockImpactApiUrl,
      expect.objectContaining({
        anonymousId: 'anon_id',
        type: 'page',
        timestamp: expect.any(String),
        properties: expect.objectContaining({ irclickid }),
      }),
    );
  });

  it('When the user has not been tracked before, then it creates a unique identifier for them', async () => {
    mockCookies({});

    await handleImpactDTCCheckout({ irclickid });

    expect(postedPayload().anonymousId).toBe(mockedUserUuid);
  });

  it('When an affiliate partner is identified, then it includes their information in the tracking event', async () => {
    await handleImpactDTCCheckout({ irclickid, utmMedium });

    expect(postedPayload().properties).toHaveProperty('partner_id', utmMedium);
  });

  it.each([undefined, null])(
    'When the affiliate partner is %s, then the tracking event omits partner information',
    async (partner) => {
      await handleImpactDTCCheckout({ irclickid, utmMedium: partner });

      expect(postedPayload().properties).not.toHaveProperty('partner_id');
    },
  );

  it('When tracking is initialized, then it persists tracking identifiers for future affiliate attribution', async () => {
    await handleImpactDTCCheckout({ irclickid, utmMedium });

    expect(setImpactCookies).toHaveBeenCalledWith('anon_id', irclickid, utmMedium);
  });

  it('When an affiliate click is tracked, then the browser and page information is included in the event', async () => {
    await handleImpactDTCCheckout({ irclickid });

    expect(postedPayload().context).toHaveProperty('userAgent');
    expect(postedPayload().context).toHaveProperty('page');
  });

  it('When the tracking service is unavailable, then it handles the failure gracefully and continues', async () => {
    const unknownError = new Error('API Error');
    axiosSpy.mockRejectedValue(unknownError);

    await expect(handleImpactDTCCheckout({ irclickid })).resolves.not.toThrow();

    expect(errorService.reportError).toHaveBeenCalledWith(unknownError);
  });
});
