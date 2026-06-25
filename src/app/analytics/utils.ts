export function setCookie(cookieName: string, cookieValue: string, expDays = 30): void {
  const date = new Date();
  date.setTime(date.getTime() + expDays * 24 * 60 * 60 * 1000);
  const expires = `expires=${date.toUTCString()}`;
  window.document.cookie = `${cookieName}=${cookieValue}; ${expires}; domain=internxt.com; Secure`;
}

export function setImpactCookies(anonymousId: string, irclickid: string, utmMedium?: string | null): void {
  const cookieDomain = 'internxt.com';

  const sourceExpiration = new Date();
  sourceExpiration.setHours(sourceExpiration.getHours() + 2);

  const anonymousExpiration = new Date();
  anonymousExpiration.setFullYear(anonymousExpiration.getFullYear() + 10);

  const trackingExpiration = new Date();
  trackingExpiration.setDate(trackingExpiration.getDate() + 30);

  document.cookie = `impactSource=Impact;expires=${sourceExpiration.toUTCString()};domain=${cookieDomain};Path=/;Secure`;
  document.cookie = `impactAnonymousId=${anonymousId};expires=${anonymousExpiration.toUTCString()};domain=${cookieDomain};Path=/;Secure`;
  document.cookie = `impactClickId=${irclickid};expires=${trackingExpiration.toUTCString()};domain=${cookieDomain};Path=/;Secure`;

  if (utmMedium) {
    document.cookie = `impactPartnerId=${utmMedium};expires=${trackingExpiration.toUTCString()};domain=${cookieDomain};Path=/;Secure`;
  }
}

export function getCookie(cookieName: string): string {
  const cookie = {};
  document.cookie.split(';').forEach((el) => {
    const [key, value] = el.split('=');
    cookie[key.trim()] = value;
  });
  return cookie[cookieName];
}
