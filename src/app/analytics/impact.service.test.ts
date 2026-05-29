import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { bytesToString } from 'app/drive/services/size.service';
import axios from 'axios';
import envService from 'services/env.service';
import errorService from 'services/error.service';
import localStorageService from 'services/local-storage.service';
import { getProductAmount } from 'views/Checkout/utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  handleImpactDTCCheckout,
  resolvePartnerIdFromUrl,
  savePaymentDataInLocalStorage,
  trackPaymentConversion,
  trackSignUp,
} from './impact.service';

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

describe('handleImpactDTCCheckout', () => {
  const irclickid = 'TZr0kB1hUxyZWqOxHoVulWsMUkuRX82pgw77Sk0';
  const utmMedium = '312695';

  it('When tracking an affiliate click, then it reports the event to Impact analytics with the click identifier', async () => {
    const getCookieMock = await import('./utils');
    vi.mocked(getCookieMock.getCookie).mockImplementation((key) => {
      if (key === 'impactAnonymousId') return 'anon_id';
      return '';
    });
    const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

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
    const getCookieMock = await import('./utils');
    vi.mocked(getCookieMock.getCookie).mockImplementation((key) => {
      if (key === 'impactAnonymousId') return '';
      return '';
    });
    const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

    await handleImpactDTCCheckout({ irclickid });

    const callArgs = axiosSpy.mock.calls[0][1] as { anonymousId: string };
    expect(callArgs.anonymousId).toBe(mockedUserUuid);
  });

  it('When an affiliate partner is identified, then it includes their information in the tracking event', async () => {
    const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

    await handleImpactDTCCheckout({ irclickid, partnerId: utmMedium });

    const callArgs = axiosSpy.mock.calls[0][1] as { properties: Record<string, unknown> };
    expect(callArgs.properties).toHaveProperty('partner_id', utmMedium);
  });

  it('When no affiliate partner is identified, then the tracking event omits partner information', async () => {
    const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

    await handleImpactDTCCheckout({ irclickid });

    const callArgs = axiosSpy.mock.calls[0][1] as { properties: Record<string, unknown> };
    expect(callArgs.properties).not.toHaveProperty('partner_id');
  });

  it('When tracking is initialized, then it persists tracking identifiers for future affiliate attribution', async () => {
    const getCookieMock = await import('./utils');
    vi.mocked(getCookieMock.getCookie).mockImplementation((key) => {
      if (key === 'impactAnonymousId') return 'anon_id';
      return '';
    });
    const setImpactCookiesSpy = vi.mocked(getCookieMock.setImpactCookies);
    vi.spyOn(axios, 'post').mockResolvedValue({});

    await handleImpactDTCCheckout({ irclickid, partnerId: utmMedium });

    expect(setImpactCookiesSpy).toHaveBeenCalledWith('anon_id', irclickid, utmMedium);
  });

  it('When the tracking service is unavailable, then it handles the failure gracefully and continues', async () => {
    const unknownError = new Error('API Error');
    vi.spyOn(axios, 'post').mockRejectedValue(unknownError);
    const errorServiceSpy = vi.spyOn(errorService, 'reportError');

    await expect(handleImpactDTCCheckout({ irclickid })).resolves.not.toThrow();

    expect(errorServiceSpy).toHaveBeenCalledWith(unknownError);
  });
});

describe('resolvePartnerIdFromUrl', () => {
  it('When utm_content is present, then it returns it as the partner ID', () => {
    expect(resolvePartnerIdFromUrl('?utm_content=partner_abc')).toBe('partner_abc');
  });

  it('When utm_medium is a numeric string, then it returns it as the partner ID', () => {
    expect(resolvePartnerIdFromUrl('?utm_medium=312695')).toBe('312695');
  });

  it('When both utm_content and utm_medium are present, then utm_content takes priority', () => {
    expect(resolvePartnerIdFromUrl('?utm_content=partner_abc&utm_medium=312695')).toBe('partner_abc');
  });

  it('When utm_medium is non-numeric, then it returns null', () => {
    expect(resolvePartnerIdFromUrl('?utm_medium=google')).toBeNull();
  });

  it('When neither utm_content nor utm_medium are present, then it returns null', () => {
    expect(resolvePartnerIdFromUrl('?utm_source=newsletter')).toBeNull();
  });

  it('When the search string is empty, then it returns null', () => {
    expect(resolvePartnerIdFromUrl('')).toBeNull();
  });
});

describe('uuid library', () => {
  it('When calling v4, then it generates a valid UUID', async () => {
    const { v4 } = await vi.importActual<typeof import('uuid')>('uuid');
    const id = v4();
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});

describe('savePaymentDataInLocalStorage - edge cases', () => {
  it('When no plan has been selected, then no plan details are stored for later', () => {
    const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');

    savePaymentDataInLocalStorage({
      subscriptionId: subId,
      paymentIntentId,
      selectedPlan: undefined,
      users: 1,
      couponCodeData: promoCode,
      isFirstPurchase: true,
    });

    expect(setToLocalStorageSpy).not.toHaveBeenCalledWith('productName', expect.anything());
    expect(setToLocalStorageSpy).not.toHaveBeenCalledWith('amountPaid', expect.anything());
    expect(setToLocalStorageSpy).not.toHaveBeenCalledWith('priceId', expect.anything());
    expect(setToLocalStorageSpy).not.toHaveBeenCalledWith('currency', expect.anything());
  });

  it('When a discount code has no identifier, then it is not stored for later use', () => {
    const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');
    const couponWithoutName = { ...promoCode, codeName: '' };

    savePaymentDataInLocalStorage({
      subscriptionId: subId,
      paymentIntentId,
      selectedPlan: product as PriceWithTax,
      users: 1,
      couponCodeData: couponWithoutName,
      isFirstPurchase: true,
    });

    expect(setToLocalStorageSpy).not.toHaveBeenCalledWith('couponCode', expect.anything());
  });

  it('When no discount code is provided, then no discount information is stored', () => {
    const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');

    savePaymentDataInLocalStorage({
      subscriptionId: subId,
      paymentIntentId,
      selectedPlan: product as PriceWithTax,
      users: 1,
      couponCodeData: undefined,
      isFirstPurchase: true,
    });

    expect(setToLocalStorageSpy).not.toHaveBeenCalledWith('couponCode', expect.anything());
  });

  it('When the user buys a lifetime plan, then no recurring subscription reference is stored', () => {
    const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');
    const lifetimeProduct = { ...product, price: { ...product.price, interval: 'lifetime' } };

    savePaymentDataInLocalStorage({
      subscriptionId: subId,
      paymentIntentId,
      selectedPlan: lifetimeProduct as PriceWithTax,
      users: 1,
      couponCodeData: promoCode,
      isFirstPurchase: true,
    });

    expect(setToLocalStorageSpy).not.toHaveBeenCalledWith('subscriptionId', expect.anything());
  });

  it('When the user buys a subscription plan, then no one-time payment reference is stored', () => {
    const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');

    savePaymentDataInLocalStorage({
      subscriptionId: subId,
      paymentIntentId,
      selectedPlan: product as PriceWithTax,
      users: 1,
      couponCodeData: promoCode,
      isFirstPurchase: true,
    });

    expect(setToLocalStorageSpy).not.toHaveBeenCalledWith('paymentIntentId', expect.anything());
  });

  it('When this is a returning customer, then that is correctly recorded', () => {
    const setToLocalStorageSpy = vi.spyOn(localStorageService, 'set');

    savePaymentDataInLocalStorage({
      subscriptionId: subId,
      paymentIntentId,
      selectedPlan: product as PriceWithTax,
      users: 1,
      couponCodeData: promoCode,
      isFirstPurchase: false,
    });

    expect(setToLocalStorageSpy).toHaveBeenCalledWith('isFirstPurchase', 'false');
  });
});

describe('trackSignUp - additional coverage', () => {
  it('When the traffic source is unknown, then no signup event is reported', async () => {
    const getCookieMock = await import('./utils');
    vi.mocked(getCookieMock.getCookie).mockImplementation((key) => {
      if (key === 'impactSource') return '';
      if (key === 'impactAnonymousId') return 'anon_id';
      return '';
    });
    const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

    await trackSignUp(mockedUserUuid);

    expect(axiosSpy).not.toHaveBeenCalled();
  });

  it('When the user arrived via a Google ad, then their ad click identifier is included in the signup event', async () => {
    const getCookieMock = await import('./utils');
    vi.mocked(getCookieMock.getCookie).mockImplementation((key) => {
      if (key === 'gclid') return 'test_gclid_123';
      if (key === 'impactSource') return 'ads';
      if (key === 'impactAnonymousId') return 'anon_id';
      return '';
    });
    const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

    await trackSignUp(mockedUserUuid);

    const callArgs = axiosSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(callArgs).toHaveProperty('gclid', 'test_gclid_123');
  });

  it('When the user did not arrive via a Google ad, then no ad click identifier is included in the signup event', async () => {
    const getCookieMock = await import('./utils');
    vi.mocked(getCookieMock.getCookie).mockImplementation((key) => {
      if (key === 'gclid') return '';
      if (key === 'impactSource') return 'ads';
      if (key === 'impactAnonymousId') return 'anon_id';
      return '';
    });
    const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

    await trackSignUp(mockedUserUuid);

    const callArgs = axiosSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(callArgs).not.toHaveProperty('gclid');
  });

  it('When Google Analytics is not available, then the signup event is still reported to Impact', async () => {
    globalThis.window.gtag = undefined as any;
    const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

    await trackSignUp(mockedUserUuid);

    expect(axiosSpy).toHaveBeenCalledTimes(1);
  });
});

describe('trackPaymentConversion - additional coverage', () => {
  it('When the shopping affiliate tracker fails, then the error is handled gracefully and the Impact conversion is still reported', async () => {
    const { sendAddShoppersConversion } = await import('./addShoppers.services');
    vi.mocked(sendAddShoppersConversion).mockImplementation(() => {
      throw new Error('AddShoppers Error');
    });
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

    await expect(trackPaymentConversion()).resolves.not.toThrow();

    expect(consoleErrorSpy).toHaveBeenCalledWith('[Impact Service] AddShoppers conversion failed:', expect.any(Error));
    expect(axiosSpy).toHaveBeenCalledTimes(1);
    consoleErrorSpy.mockRestore();
  });

  it('When no discount code was used, then no promo code is included in the conversion event', async () => {
    vi.spyOn(localStorageService, 'get').mockImplementation((key) => {
      if (key === 'couponCode') return null;
      if (key === 'amountPaid') return expectedAmount;
      if (key === 'subscriptionId') return subId;
      if (key === 'isFirstPurchase') return 'true';
      if (key === 'currency') return product.price.currency;
      return null;
    });
    const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

    await trackPaymentConversion();

    const callArgs = axiosSpy.mock.calls[0][1] as { properties: Record<string, unknown> };
    expect(callArgs.properties).not.toHaveProperty('order_promo_code');
  });

  it('When a first-time customer arrives through a tracked channel, then the conversion is reported even without a discount code', async () => {
    vi.spyOn(localStorageService, 'get').mockImplementation((key) => {
      if (key === 'couponCode') return null;
      if (key === 'amountPaid') return expectedAmount;
      if (key === 'subscriptionId') return subId;
      if (key === 'isFirstPurchase') return 'true';
      if (key === 'currency') return product.price.currency;
      return null;
    });
    const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

    await trackPaymentConversion();

    expect(axiosSpy).toHaveBeenCalledTimes(1);
  });

  it('When a first-time customer uses the CLOUDOFF partner code on a direct visit, then the conversion is still attributed to the partner', async () => {
    const getCookieMock = await import('./utils');
    vi.mocked(getCookieMock.getCookie).mockImplementation((key) => {
      if (key === 'impactSource') return 'direct';
      if (key === 'impactAnonymousId') return 'anon_id';
      return '';
    });
    vi.spyOn(localStorageService, 'get').mockImplementation((key) => {
      if (key === 'couponCode') return 'CLOUDOFF';
      if (key === 'amountPaid') return expectedAmount;
      if (key === 'subscriptionId') return subId;
      if (key === 'isFirstPurchase') return 'true';
      return null;
    });
    const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

    await trackPaymentConversion();

    expect(axiosSpy).toHaveBeenCalledTimes(1);
  });

  it('When a first-time customer uses the SPECIAL partner code on a direct visit, then the conversion is still attributed to the partner', async () => {
    const getCookieMock = await import('./utils');
    vi.mocked(getCookieMock.getCookie).mockImplementation((key) => {
      if (key === 'impactSource') return 'direct';
      if (key === 'impactAnonymousId') return 'anon_id';
      return '';
    });
    vi.spyOn(localStorageService, 'get').mockImplementation((key) => {
      if (key === 'couponCode') return 'SPECIAL';
      if (key === 'amountPaid') return expectedAmount;
      if (key === 'subscriptionId') return subId;
      if (key === 'isFirstPurchase') return 'true';
      return null;
    });
    const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

    await trackPaymentConversion();

    expect(axiosSpy).toHaveBeenCalledTimes(1);
  });

  it('When a conversion is tracked, then the shopping affiliate is notified with the customer and purchase details', async () => {
    const { sendAddShoppersConversion } = await import('./addShoppers.services');
    vi.spyOn(axios, 'post').mockResolvedValue({});

    await trackPaymentConversion();

    expect(sendAddShoppersConversion).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: mockedUserUuid,
        email: 'usuario@ejemplo.com',
        currency: product.price.currency,
      }),
    );
  });
});

describe('handleImpactDTCCheckout - additional coverage', () => {
  const irclickid = 'TZr0kB1hUxyZWqOxHoVulWsMUkuRX82pgw77Sk0';

  it('When an affiliate click is tracked, then the browser and page information is included in the event', async () => {
    const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

    await handleImpactDTCCheckout({ irclickid });

    const callArgs = axiosSpy.mock.calls[0][1] as { context: Record<string, unknown> };
    expect(callArgs.context).toHaveProperty('userAgent');
    expect(callArgs.context).toHaveProperty('page');
  });

  it('When no affiliate partner is identified, then no partner information is included in the event', async () => {
    const axiosSpy = vi.spyOn(axios, 'post').mockResolvedValue({});

    await handleImpactDTCCheckout({ irclickid, partnerId: null });

    const callArgs = axiosSpy.mock.calls[0][1] as { properties: Record<string, unknown> };
    expect(callArgs.properties).not.toHaveProperty('partner_id');
  });
});
