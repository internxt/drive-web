import { LocalStorageItem } from 'app/core/types';
import errorService from 'services/error.service';
import localStorageService from 'services/local-storage.service';
import { getCookie } from './utils';

interface PostbackPartner {
  utmSource: string;
  postbackUrl: string;
  networkId: string;
}

const POSTBACK_PARTNERS: readonly PostbackPartner[] = [
  {
    utmSource: 'S42MF2',
    postbackUrl: 'https://www.p0stb4ck.com/',
    networkId: '1134',
  },
];

const PARTNER_COOKIE = 'postbackPartner';
const CLICK_ID_COOKIE = 'postbackClickId';

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
  try {
    const partner = findPartnerByUtmSource(getCookie(PARTNER_COOKIE));
    if (!partner) {
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

    const amountPaid = localStorageService.get(LocalStorageItem.AmountPaid);
    const amount = Number.parseFloat(amountPaid ?? '0');

    const postbackUrl = new URL(partner.postbackUrl);
    postbackUrl.searchParams.set('nid', partner.networkId);
    postbackUrl.searchParams.set('transaction_id', decodeURIComponent(affiliateClickId));
    postbackUrl.searchParams.set('amount', String(Number.isFinite(amount) ? amount : 0));

    await fetch(postbackUrl.toString(), { method: 'GET', mode: 'no-cors', keepalive: true });
  } catch (error) {
    const castedError = errorService.castError(error);
    errorService.reportError(castedError);
  }
}
