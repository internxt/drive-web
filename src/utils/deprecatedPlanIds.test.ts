import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { DEPRECATED_PLAN_IDS, rewriteDeprecatedPlanId } from './deprecatedPlanIds';

const [RETIRED_PLAN_ID, CURRENT_PLAN_ID] = Object.entries(DEPRECATED_PLAN_IDS)[0];
const ACTIVE_PLAN_ID = 'price_1SomeOtherActivePriceId';

const CAMPAIGN_SEARCH =
  `?planId=${RETIRED_PLAN_ID}&couponCode=SPECIAL&planType=individual&currency=eur&mode=payment` +
  '&irclickid=VDATvXyxdxyZRKTUCo0LBx1tUkr0ecwVAzMh2U0&irgwc=1&afsrc=1&utm_source=Impact' +
  '&utm_medium=referral&utm_campaign=312695';

let originalUrl: string;

const land = (pathname: string, search = '') => {
  window.history.replaceState(null, '', pathname + search);
};

describe('Retired checkout prices', () => {
  beforeAll(() => {
    originalUrl = window.location.href;
  });

  afterEach(() => {
    window.history.replaceState(null, '', originalUrl);
  });

  it('sends a user arriving with a retired price to the price currently on sale', () => {
    land('/checkout', CAMPAIGN_SEARCH);

    rewriteDeprecatedPlanId(DEPRECATED_PLAN_IDS);

    expect(new URLSearchParams(window.location.search).get('planId')).toBe(CURRENT_PLAN_ID);
  });

  it('keeps the coupon and the affiliate attribution of the campaign', () => {
    land('/checkout', CAMPAIGN_SEARCH);

    rewriteDeprecatedPlanId(DEPRECATED_PLAN_IDS);
    const params = new URLSearchParams(window.location.search);

    expect(params.get('couponCode')).toBe('SPECIAL');
    expect(params.get('planType')).toBe('individual');
    expect(params.get('currency')).toBe('eur');
    expect(params.get('mode')).toBe('payment');
    expect(params.get('irclickid')).toBe('VDATvXyxdxyZRKTUCo0LBx1tUkr0ecwVAzMh2U0');
    expect(params.get('irgwc')).toBe('1');
    expect(params.get('afsrc')).toBe('1');
    expect(params.get('utm_source')).toBe('Impact');
    expect(params.get('utm_medium')).toBe('referral');
    expect(params.get('utm_campaign')).toBe('312695');
  });

  it('does not add the retired link to the browser history', () => {
    const entriesBefore = window.history.length;
    land('/checkout', `?planId=${RETIRED_PLAN_ID}`);

    rewriteDeprecatedPlanId(DEPRECATED_PLAN_IDS);

    expect(window.history).toHaveLength(entriesBefore);
  });

  it('leaves a checkout opened with a price still on sale untouched', () => {
    land('/checkout', `?planId=${ACTIVE_PLAN_ID}&couponCode=SPECIAL`);

    rewriteDeprecatedPlanId(DEPRECATED_PLAN_IDS);

    expect(window.location.search).toBe(`?planId=${ACTIVE_PLAN_ID}&couponCode=SPECIAL`);
  });

  it('leaves a checkout opened without a price untouched', () => {
    land('/checkout', '?couponCode=SPECIAL');

    rewriteDeprecatedPlanId(DEPRECATED_PLAN_IDS);

    expect(window.location.search).toBe('?couponCode=SPECIAL');
  });

  it('ignores a retired price arriving at any view other than the checkout', () => {
    land('/login', `?planId=${RETIRED_PLAN_ID}`);

    rewriteDeprecatedPlanId(DEPRECATED_PLAN_IDS);

    expect(window.location.search).toBe(`?planId=${RETIRED_PLAN_ID}`);
  });

  it('also covers the checkout subroutes and a deployment served under a base path', () => {
    land('/checkout/success', `?planId=${RETIRED_PLAN_ID}`);
    rewriteDeprecatedPlanId(DEPRECATED_PLAN_IDS);
    expect(new URLSearchParams(window.location.search).get('planId')).toBe(CURRENT_PLAN_ID);

    land('/drive/checkout', `?planId=${RETIRED_PLAN_ID}`);
    rewriteDeprecatedPlanId(DEPRECATED_PLAN_IDS);
    expect(new URLSearchParams(window.location.search).get('planId')).toBe(CURRENT_PLAN_ID);
  });

  it('does not mistake a path that merely starts with checkout for the checkout', () => {
    land('/checkout-something-else', `?planId=${RETIRED_PLAN_ID}`);

    rewriteDeprecatedPlanId(DEPRECATED_PLAN_IDS);

    expect(window.location.search).toBe(`?planId=${RETIRED_PLAN_ID}`);
  });

  it('ignores a planId that names an inherited object property', () => {
    land('/checkout', '?planId=toString');

    rewriteDeprecatedPlanId(DEPRECATED_PLAN_IDS);

    expect(window.location.search).toBe('?planId=toString');
  });

  it('retires the price of the ended campaign in favour of its replacement', () => {
    expect(DEPRECATED_PLAN_IDS['price_1T1xQtFAOdcgaBMQ1r2JnHsE']).toBe('price_1U6Ev3FAOdcgaBMQHxOAmWPO');
  });
});
