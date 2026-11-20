import { LocalStorageItem } from 'app/core/types';
import errorService from 'services/error.service';
import localStorageService from 'services/local-storage.service';
import { getCookie } from './utils';

interface PostbackPartner {
  utmSource: string;
  postbackUrl: string;
  networkId: string;
  couponCode: string;
}

const POSTBACK_PARTNERS: readonly PostbackPartner[] = [
  {
    utmSource: 'S42MF2',
    postbackUrl: 'https://www.p0stb4ck.com/',
    networkId: '1134',
    couponCode: 'TFA',
  },
];

const PARTNER_COOKIE = 'postbackPartner';
const CLICK_ID_COOKIE = 'postbackClickId';

const CPA_AMOUNT_BY_PLAN: Readonly<Record<string, number>> = {
  price_1U6Ev3FAOdcgaBMQHxOAmWPO: 180,
  price_1T1xQtFAOdcgaBMQ1r2JnHsE: 180,
  price_1UAwSbFAOdcgaBMQkJhPExCz: 180,
  price_1TRoAJFAOdcgaBMQveT6cebN: 80,
  price_1UZCCZFAOdcgaBMQO9bKb6I9: 80,
  price_1UAsSAFAOdcgaBMQNF0j8UfV: 80,
  price_1UKYnMFAOdcgaBMQ09GLzJhJ: 80,
  price_1UKYjUFAOdcgaBMQ7ZdV42BA: 19,
};

function getCpaAmount(priceId: string | null): number {
  return CPA_AMOUNT_BY_PLAN[priceId ?? ''] ?? 0;
}

function findPartnerByUtmSource(utmSource: string | null | undefined): PostbackPartner | undefined {
  if (!utmSource) {
    return undefined;
  }

  return POSTBACK_PARTNERS.find((partner) => partner.utmSource.toLowerCase() === utmSource.toLowerCase());
}

function setPostbackCookie(cookieName: string, value: string): void {
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + 30);

  document.cookie = `${cookieName}=${encodeURIComponent(value)};expires=${expiration.toUTCString()};Path=/;Secure`;
}

function clearPostbackCookies(): void {
  for (const cookieName of [PARTNER_COOKIE, CLICK_ID_COOKIE]) {
    document.cookie = `${cookieName}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;Path=/;Secure`;
  }
}

function isPartnerCoupon(partner: PostbackPartner, couponCode: string | null): boolean {
  return couponCode?.toLowerCase() === partner.couponCode.toLowerCase();
}

export function capturePostbackPartner(utmSource: string | null, affiliateClickId: string | null): void {
  const partner = findPartnerByUtmSource(utmSource);

  if (!partner) {
    return;
  }

  setPostbackCookie(PARTNER_COOKIE, partner.utmSource);

  if (affiliateClickId) {
    setPostbackCookie(CLICK_ID_COOKIE, affiliateClickId);
  }
}

export async function sendPurchasePostback(): Promise<void> {
  const partner = findPartnerByUtmSource(getCookie(PARTNER_COOKIE));
  if (!partner) {
    return;
  }

  try {
    if (!isPartnerCoupon(partner, localStorageService.get(LocalStorageItem.CouponCode))) {
      return;
    }

    const isFirstPurchase = localStorageService.get(LocalStorageItem.IsFirstPurchase) === 'true';
    if (!isFirstPurchase) {
      return;
    }

    const affiliateClickId = getCookie(CLICK_ID_COOKIE);

    if (!affiliateClickId) {
      console.warn('[Partner Postback] No affiliate click id to report, skipping postback');
      return;
    }

    const postbackUrl = new URL(partner.postbackUrl);
    postbackUrl.searchParams.set('nid', partner.networkId);
    postbackUrl.searchParams.set('transaction_id', decodeURIComponent(affiliateClickId));
    postbackUrl.searchParams.set('amount', String(getCpaAmount(localStorageService.get(LocalStorageItem.PriceId))));

    await fetch(postbackUrl.toString(), { method: 'GET', mode: 'no-cors', keepalive: true });
  } catch (error) {
    const castedError = errorService.castError(error);
    errorService.reportError(castedError);
  } finally {
    clearPostbackCookies();
  }
}
