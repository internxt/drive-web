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
const AFFILIATE_CLICK_ID = 'click_123';

type StoredPaymentData = Partial<Record<string, string>>;

const givenStoredPaymentData = (data: StoredPaymentData) => {
  vi.mocked(localStorageService.get).mockImplementation((key) => data[key] ?? null);
};

const givenCookies = (cookies: Partial<Record<string, string>>) => {
  mocks.getCookie.mockImplementation((name: string) => cookies[name]);
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

    const getWrittenCookie = (cookieName: string): string => {
      const cookie = cookieSetter.mock.calls
        .map((call) => call[0] as string)
        .find((value) => value.startsWith(`${cookieName}=`));

      if (!cookie) {
        throw new Error(`The ${cookieName} cookie should have been written`);
      }

      return cookie;
    };

    it('When the user comes from a collaborator with its own postback, then the collaborator and its click are remembered for the purchase', () => {
      capturePostbackPartner(PARTNER_UTM_SOURCE, AFFILIATE_CLICK_ID);

      expect(getWrittenCookie('postbackPartner')).toContain(`postbackPartner=${PARTNER_UTM_SOURCE}`);
      expect(getWrittenCookie('postbackClickId')).toContain(`postbackClickId=${AFFILIATE_CLICK_ID}`);
    });

    it('When the source is written in a different case, then the collaborator is still recognized', () => {
      capturePostbackPartner(PARTNER_UTM_SOURCE.toLowerCase(), AFFILIATE_CLICK_ID);

      expect(getWrittenCookie('postbackPartner')).toContain(`postbackPartner=${PARTNER_UTM_SOURCE}`);
    });

    it('When the click id carries characters that would break the cookie, then it is stored encoded', () => {
      capturePostbackPartner(PARTNER_UTM_SOURCE, 'a=b;c d');

      expect(getWrittenCookie('postbackClickId')).toContain('postbackClickId=a%3Db%3Bc%20d');
    });

    it('When the link carries no click id, then only the collaborator is remembered', () => {
      capturePostbackPartner(PARTNER_UTM_SOURCE, null);

      expect(getWrittenCookie('postbackPartner')).toContain(`postbackPartner=${PARTNER_UTM_SOURCE}`);
      expect(cookieSetter).toHaveBeenCalledOnce();
    });

    it('When the collaborator is remembered, then the cookies stay on this host, over HTTPS, for 30 days', () => {
      const before = new Date();
      capturePostbackPartner(PARTNER_UTM_SOURCE, AFFILIATE_CLICK_ID);

      for (const cookieName of ['postbackPartner', 'postbackClickId']) {
        const cookie = getWrittenCookie(cookieName);
        expect(cookie).toContain('Path=/');
        expect(cookie).toContain('Secure');
        expect(cookie).not.toContain('domain=');

        const expires = cookie.match(/expires=([^;]+)/)?.[1] ?? '';
        const daysDiff = (new Date(expires).getTime() - before.getTime()) / (1000 * 60 * 60 * 24);
        expect(daysDiff).toBeGreaterThan(29);
        expect(daysDiff).toBeLessThan(31);
      }
    });

    it('When the user comes from another source, then nothing is remembered', () => {
      capturePostbackPartner('Impact', AFFILIATE_CLICK_ID);

      expect(cookieSetter).not.toHaveBeenCalled();
    });

    it('When the link carries no source, then nothing is remembered', () => {
      capturePostbackPartner(null, AFFILIATE_CLICK_ID);

      expect(cookieSetter).not.toHaveBeenCalled();
    });
  });

  describe('sendPurchasePostback', () => {
    const sendPostbackForStoredPaymentData = async (data: StoredPaymentData) => {
      givenCookies({ postbackPartner: PARTNER_UTM_SOURCE, postbackClickId: AFFILIATE_CLICK_ID });
      givenStoredPaymentData({ isFirstPurchase: 'true', ...data });

      await sendPurchasePostback();
    };

    it('When a purchase comes from the collaborator, then it is reported with the click of its link and the amount paid', async () => {
      await sendPostbackForStoredPaymentData({ amountPaid: '9.99' });

      expect(fetchMock).toHaveBeenCalledOnce();

      const url = getPostbackUrl(fetchMock);
      expect(url.origin + url.pathname).toBe('https://www.p0stb4ck.com/');
      expect(url.searchParams.get('nid')).toBe('1134');
      expect(url.searchParams.get('transaction_id')).toBe(AFFILIATE_CLICK_ID);
      expect(url.searchParams.get('amount')).toBe('9.99');
    });

    it('When the stored click id was encoded, then it is reported as it came in the link', async () => {
      givenCookies({ postbackPartner: PARTNER_UTM_SOURCE, postbackClickId: 'a%3Db%3Bc%20d' });
      givenStoredPaymentData({ isFirstPurchase: 'true', amountPaid: '9.99' });

      await sendPurchasePostback();

      expect(getPostbackUrl(fetchMock).searchParams.get('transaction_id')).toBe('a=b;c d');
    });

    it('When the purchase does not come from a collaborator with its own postback, then nothing is sent', async () => {
      givenCookies({ postbackClickId: AFFILIATE_CLICK_ID });
      givenStoredPaymentData({ isFirstPurchase: 'true', amountPaid: '9.99' });

      await sendPurchasePostback();

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('When the purchase is not the first one, then it is not reported', async () => {
      await sendPostbackForStoredPaymentData({ isFirstPurchase: 'false' });

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('When there is no click to attribute the purchase to, then no postback is sent', async () => {
      givenCookies({ postbackPartner: PARTNER_UTM_SOURCE });
      givenStoredPaymentData({ isFirstPurchase: 'true', amountPaid: '9.99' });

      await sendPurchasePostback();

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('When the amount paid is unknown, then it is reported as zero', async () => {
      await sendPostbackForStoredPaymentData({});

      expect(getPostbackUrl(fetchMock).searchParams.get('amount')).toBe('0');
    });

    it('When the collaborator endpoint fails, then the error does not break the purchase tracking', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      await expect(sendPostbackForStoredPaymentData({ amountPaid: '9.99' })).resolves.toBeUndefined();
    });
  });
});
