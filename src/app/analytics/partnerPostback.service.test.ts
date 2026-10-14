import { beforeEach, describe, expect, it, vi } from 'vitest';
import localStorageService from 'services/local-storage.service';
import { capturePostbackPartner, sendPurchasePostback } from './partnerPostback.service';

const mocks = vi.hoisted(() => ({
  getCookie: vi.fn(),
}));

vi.mock('./utils', () => ({ getCookie: mocks.getCookie }));

vi.mock('services/local-storage.service', () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
    removeItem: vi.fn(),
  },
}));

vi.mock('services/error.service', () => ({
  default: {
    castError: vi.fn().mockImplementation((error) => error),
    reportError: vi.fn(),
  },
}));

const PARTNER_UTM_SOURCE = 'S42MF2';
const SUBSCRIPTION_ID = 'sub_123';
const PAYMENT_INTENT_ID = 'pi_123';

type StoredPaymentData = Partial<Record<string, string>>;

const givenStoredPaymentData = (data: StoredPaymentData) => {
  vi.mocked(localStorageService.get).mockImplementation((key) => data[key] ?? null);
};

const givenPartnerCookie = (utmSource: string | undefined) => {
  mocks.getCookie.mockReturnValue(utmSource);
};

const getPostbackUrl = (fetchMock: ReturnType<typeof vi.fn>) => new URL(fetchMock.mock.calls[0][0] as string);

describe('Partner postback service', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('fetch', fetchMock);
  });

  describe('capturePostbackPartner', () => {
    let cookieSetter: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      cookieSetter = vi.spyOn(document, 'cookie', 'set');
    });

    const getPartnerCookie = (): string => {
      const cookie = cookieSetter.mock.calls
        .map((call) => call[0] as string)
        .find((value) => value.startsWith('postbackPartner='));

      if (!cookie) {
        throw new Error('The partner cookie should have been written');
      }

      return cookie;
    };

    it('When the user comes from a collaborator with its own postback, then it is remembered for the purchase', () => {
      capturePostbackPartner(PARTNER_UTM_SOURCE);

      expect(getPartnerCookie()).toContain(`postbackPartner=${PARTNER_UTM_SOURCE}`);
    });

    it('When the source is written in a different case, then the collaborator is still recognized', () => {
      capturePostbackPartner(PARTNER_UTM_SOURCE.toLowerCase());

      expect(getPartnerCookie()).toContain(`postbackPartner=${PARTNER_UTM_SOURCE}`);
    });

    it('When the collaborator is remembered, then the cookie stays on this host, over HTTPS, for 30 days', () => {
      const before = new Date();
      capturePostbackPartner(PARTNER_UTM_SOURCE);

      const cookie = getPartnerCookie();
      expect(cookie).toContain('Path=/');
      expect(cookie).toContain('Secure');
      expect(cookie).not.toContain('domain=');

      const expires = cookie.match(/expires=([^;]+)/)?.[1] ?? '';
      const daysDiff = (new Date(expires).getTime() - before.getTime()) / (1000 * 60 * 60 * 24);
      expect(daysDiff).toBeGreaterThan(29);
      expect(daysDiff).toBeLessThan(31);
    });

    it('When the user comes from another source, then nothing is remembered', () => {
      capturePostbackPartner('Impact');

      expect(cookieSetter).not.toHaveBeenCalled();
    });

    it('When the link carries no source, then nothing is remembered', () => {
      capturePostbackPartner(null);

      expect(cookieSetter).not.toHaveBeenCalled();
    });
  });

  describe('sendPurchasePostback', () => {
    const sendPostbackForStoredPaymentData = async (data: StoredPaymentData) => {
      givenPartnerCookie(PARTNER_UTM_SOURCE);
      givenStoredPaymentData({ isFirstPurchase: 'true', ...data });

      await sendPurchasePostback();
    };

    it('When a subscription is purchased, then it is reported with the subscription and the amount paid', async () => {
      await sendPostbackForStoredPaymentData({ subscriptionId: SUBSCRIPTION_ID, amountPaid: '9.99' });

      expect(fetchMock).toHaveBeenCalledOnce();

      const url = getPostbackUrl(fetchMock);
      expect(url.origin + url.pathname).toBe('https://www.p0stb4ck.com/');
      expect(url.searchParams.get('nid')).toBe('1134');
      expect(url.searchParams.get('transaction_id')).toBe(SUBSCRIPTION_ID);
      expect(url.searchParams.get('amount')).toBe('9.99');
    });

    it('When a lifetime is purchased, then it is reported with the payment intent', async () => {
      await sendPostbackForStoredPaymentData({ paymentIntentId: PAYMENT_INTENT_ID, amountPaid: '299' });

      expect(getPostbackUrl(fetchMock).searchParams.get('transaction_id')).toBe(PAYMENT_INTENT_ID);
    });

    it('When the purchase does not come from a collaborator with its own postback, then nothing is sent', async () => {
      givenPartnerCookie(undefined);
      givenStoredPaymentData({ isFirstPurchase: 'true', subscriptionId: SUBSCRIPTION_ID, amountPaid: '9.99' });

      await sendPurchasePostback();

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('When the purchase is not the first one, then it is not reported', async () => {
      await sendPostbackForStoredPaymentData({ subscriptionId: SUBSCRIPTION_ID, isFirstPurchase: 'false' });

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('When there is no transaction to report, then no postback is sent', async () => {
      await sendPostbackForStoredPaymentData({ amountPaid: '9.99' });

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('When the amount paid is unknown, then it is reported as zero', async () => {
      await sendPostbackForStoredPaymentData({ subscriptionId: SUBSCRIPTION_ID });

      expect(getPostbackUrl(fetchMock).searchParams.get('amount')).toBe('0');
    });

    it('When the collaborator endpoint fails, then the error does not break the purchase tracking', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      await expect(
        sendPostbackForStoredPaymentData({ subscriptionId: SUBSCRIPTION_ID, amountPaid: '9.99' }),
      ).resolves.toBeUndefined();
    });
  });
});
