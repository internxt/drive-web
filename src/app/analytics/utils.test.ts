import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setImpactCookies } from './utils';

function getCookieCalls(cookieSetter: ReturnType<typeof vi.spyOn>): string[] {
  return cookieSetter.mock.calls.map((call) => call[0] as string);
}

describe('setImpactCookies', () => {
  let cookieSetter: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    cookieSetter = vi.spyOn(document, 'cookie', 'set');
  });

  it('When called, then it marks the traffic source as Impact', () => {
    setImpactCookies('anon_123', 'click_abc');

    const sourceCookie = getCookieCalls(cookieSetter).find((v) => v.startsWith('impactSource='));
    expect(sourceCookie).toBeDefined();
    expect(sourceCookie).toContain('impactSource=Impact');
  });

  it('When called, then it stores the anonymous identifier so the user can be recognized later', () => {
    setImpactCookies('anon_123', 'click_abc');

    const anonCookie = getCookieCalls(cookieSetter).find((v) => v.startsWith('impactAnonymousId='));
    expect(anonCookie).toBeDefined();
    expect(anonCookie).toContain('impactAnonymousId=anon_123');
  });

  it('When called, then it stores the affiliate click identifier for attribution', () => {
    setImpactCookies('anon_123', 'click_abc');

    const clickCookie = getCookieCalls(cookieSetter).find((v) => v.startsWith('impactClickId='));
    expect(clickCookie).toBeDefined();
    expect(clickCookie).toContain('impactClickId=click_abc');
  });

  it('When an affiliate partner is identified, then their identifier is also stored', () => {
    setImpactCookies('anon_123', 'click_abc', 'partner_456');

    const partnerCookie = getCookieCalls(cookieSetter).find((v) => v.startsWith('impactPartnerId='));
    expect(partnerCookie).toBeDefined();
    expect(partnerCookie).toContain('impactPartnerId=partner_456');
  });

  it('When no affiliate partner is identified, then no partner cookie is stored', () => {
    setImpactCookies('anon_123', 'click_abc');

    const partnerCookie = getCookieCalls(cookieSetter).find((v) => v.startsWith('impactPartnerId='));
    expect(partnerCookie).toBeUndefined();
  });

  it('When no affiliate partner is identified due to an explicit absence, then no partner cookie is stored', () => {
    setImpactCookies('anon_123', 'click_abc', null);

    const partnerCookie = getCookieCalls(cookieSetter).find((v) => v.startsWith('impactPartnerId='));
    expect(partnerCookie).toBeUndefined();
  });

  it('When called, then the traffic source cookie expires within hours, not days', () => {
    const before = new Date();
    setImpactCookies('anon_123', 'click_abc');

    const sourceCookie = getCookieCalls(cookieSetter).find((v) => v.startsWith('impactSource='))!;
    const expiresDate = new Date(sourceCookie.match(/expires=([^;]+)/)![1]);
    const hoursDiff = (expiresDate.getTime() - before.getTime()) / (1000 * 60 * 60);

    expect(hoursDiff).toBeGreaterThan(1);
    expect(hoursDiff).toBeLessThan(3);
  });

  it('When called, then the anonymous identifier cookie is kept for years so returning users are recognized', () => {
    const before = new Date();
    setImpactCookies('anon_123', 'click_abc');

    const anonCookie = getCookieCalls(cookieSetter).find((v) => v.startsWith('impactAnonymousId='))!;
    const expiresDate = new Date(anonCookie.match(/expires=([^;]+)/)![1]);
    const yearsDiff = (expiresDate.getTime() - before.getTime()) / (1000 * 60 * 60 * 24 * 365);

    expect(yearsDiff).toBeGreaterThan(9);
    expect(yearsDiff).toBeLessThan(11);
  });

  it('When called, then the affiliate click cookie expires after 30 days', () => {
    const before = new Date();
    setImpactCookies('anon_123', 'click_abc');

    const clickCookie = getCookieCalls(cookieSetter).find((v) => v.startsWith('impactClickId='))!;
    const expiresDate = new Date(clickCookie.match(/expires=([^;]+)/)![1]);
    const daysDiff = (expiresDate.getTime() - before.getTime()) / (1000 * 60 * 60 * 24);

    expect(daysDiff).toBeGreaterThan(29);
    expect(daysDiff).toBeLessThan(31);
  });
});
