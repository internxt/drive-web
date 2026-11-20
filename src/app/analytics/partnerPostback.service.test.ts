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
const PARTNER_COUPON = 'TFA';
const AFFILIATE_CLICK_ID = 'click_123';
const EXPIRED_COOKIE_DATE = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
const AGREED_CPA_BY_PLAN = [
  { planId: 'price_1U6Ev3FAOdcgaBMQHxOAmWPO', agreedCpa: '180' },
  { planId: 'price_1T1xQtFAOdcgaBMQ1r2JnHsE', agreedCpa: '180' },
  { planId: 'price_1UAwSbFAOdcgaBMQkJhPExCz', agreedCpa: '180' },
  { planId: 'price_1TRoAJFAOdcgaBMQveT6cebN', agreedCpa: '80' },
  { planId: 'price_1UZCCZFAOdcgaBMQO9bKb6I9', agreedCpa: '80' },
  { planId: 'price_1UAsSAFAOdcgaBMQNF0j8UfV', agreedCpa: '80' },
  { planId: 'price_1UKYnMFAOdcgaBMQ09GLzJhJ', agreedCpa: '80' },
  { planId: 'price_1UKYjUFAOdcgaBMQ7ZdV42BA', agreedCpa: '19' },
];

const [{ planId: ANY_CAMPAIGN_PLAN, agreedCpa: ANY_CAMPAIGN_PLAN_CPA }] = AGREED_CPA_BY_PLAN;

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
    let cookieSetter: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      cookieSetter = vi.spyOn(document, 'cookie', 'set');
    });

    const getWrittenCookies = (): string[] => cookieSetter.mock.calls.map((call) => call[0] as string);

    const expectPostbackCookiesCleared = () => {
      const writtenCookies = getWrittenCookies();
      for (const cookieName of ['postbackPartner', 'postbackClickId']) {
        const cookie = writtenCookies.find((value) => value.startsWith(`${cookieName}=;`));
        expect(cookie).toBeDefined();
        expect(cookie).toContain(EXPIRED_COOKIE_DATE);
        expect(cookie).toContain('Path=/');
      }
    };

    const sendPostbackForStoredPaymentData = async (data: StoredPaymentData) => {
      givenCookies({ postbackPartner: PARTNER_UTM_SOURCE, postbackClickId: AFFILIATE_CLICK_ID });
      givenStoredPaymentData({ isFirstPurchase: 'true', couponCode: PARTNER_COUPON, ...data });

      await sendPurchasePostback();
    };

    it('When a purchase comes from the collaborator, then it is reported with the click of its link and the agreed amount', async () => {
      await sendPostbackForStoredPaymentData({ priceId: ANY_CAMPAIGN_PLAN, amountPaid: '9.99' });

      expect(fetchMock).toHaveBeenCalledOnce();

      const url = getPostbackUrl(fetchMock);
      expect(url.origin + url.pathname).toBe('https://www.p0stb4ck.com/');
      expect(url.searchParams.get('nid')).toBe('1134');
      expect(url.searchParams.get('transaction_id')).toBe(AFFILIATE_CLICK_ID);
      expect(url.searchParams.get('amount')).toBe(ANY_CAMPAIGN_PLAN_CPA);
    });

    it.each(AGREED_CPA_BY_PLAN)(
      'When the plan $planId of the campaign is bought, then its agreed amount of $agreedCpa is reported instead of what was paid',
      async ({ planId, agreedCpa }) => {
        await sendPostbackForStoredPaymentData({ priceId: planId, amountPaid: '299' });

        expect(getPostbackUrl(fetchMock).searchParams.get('amount')).toBe(agreedCpa);
      },
    );

    it('When a plan outside the campaign is bought, then the purchase is reported with no amount to pay', async () => {
      await sendPostbackForStoredPaymentData({ priceId: 'price_other', amountPaid: '9.99' });

      expect(getPostbackUrl(fetchMock).searchParams.get('amount')).toBe('0');
    });

    it('When the stored click id was encoded, then it is reported as it came in the link', async () => {
      givenCookies({ postbackPartner: PARTNER_UTM_SOURCE, postbackClickId: 'a%3Db%3Bc%20d' });
      givenStoredPaymentData({ isFirstPurchase: 'true', couponCode: PARTNER_COUPON, amountPaid: '9.99' });

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
      givenStoredPaymentData({ isFirstPurchase: 'true', couponCode: PARTNER_COUPON, amountPaid: '9.99' });

      await sendPurchasePostback();

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('When the plan bought is unknown, then the purchase is reported with no amount to pay', async () => {
      await sendPostbackForStoredPaymentData({});

      expect(getPostbackUrl(fetchMock).searchParams.get('amount')).toBe('0');
    });

    it('When the collaborator endpoint fails, then the error does not break the purchase tracking', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      await expect(sendPostbackForStoredPaymentData({ amountPaid: '9.99' })).resolves.toBeUndefined();
    });

    it('When the purchase was paid with the coupon of another affiliate, then it is not reported to the collaborator', async () => {
      await sendPostbackForStoredPaymentData({ couponCode: 'AFFIOFFER', priceId: ANY_CAMPAIGN_PLAN });

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('When the purchase was paid without any coupon, then it is not reported to the collaborator', async () => {
      await sendPostbackForStoredPaymentData({ couponCode: undefined, priceId: ANY_CAMPAIGN_PLAN });

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('When the collaborator coupon is written in a different case, then the purchase is still reported', async () => {
      await sendPostbackForStoredPaymentData({ couponCode: PARTNER_COUPON.toLowerCase(), priceId: ANY_CAMPAIGN_PLAN });

      expect(fetchMock).toHaveBeenCalledOnce();
    });

    it('When a purchase is reported, then the collaborator attribution is forgotten so it cannot be reported again', async () => {
      await sendPostbackForStoredPaymentData({ priceId: ANY_CAMPAIGN_PLAN });

      expect(fetchMock).toHaveBeenCalledOnce();
      expectPostbackCookiesCleared();
    });

    it('When a purchase is paid with the coupon of another affiliate, then the collaborator attribution is forgotten too', async () => {
      await sendPostbackForStoredPaymentData({ couponCode: 'AFFIOFFER', priceId: ANY_CAMPAIGN_PLAN });

      expectPostbackCookiesCleared();
    });

    it('When the collaborator endpoint fails, then the collaborator attribution is forgotten anyway', async () => {
      fetchMock.mockRejectedValue(new Error('Network error'));

      await sendPostbackForStoredPaymentData({ priceId: ANY_CAMPAIGN_PLAN });

      expectPostbackCookiesCleared();
    });

    it('When the purchase does not come from a collaborator with its own postback, then no cookie is touched', async () => {
      givenCookies({});
      givenStoredPaymentData({ isFirstPurchase: 'true', couponCode: PARTNER_COUPON });

      await sendPurchasePostback();

      expect(cookieSetter).not.toHaveBeenCalled();
    });
  });
});
