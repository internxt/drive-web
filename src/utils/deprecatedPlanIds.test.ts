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

  describe('When a user lands on the checkout with a price that is no longer on sale', () => {
    it('Then the checkout opens with the price that replaced it', () => {
      land('/checkout', CAMPAIGN_SEARCH);

      rewriteDeprecatedPlanId(DEPRECATED_PLAN_IDS);

      expect(new URLSearchParams(window.location.search).get('planId')).toBe(CURRENT_PLAN_ID);
    });

    it('Then the coupon and the affiliate attribution of the campaign survive', () => {
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

    it('Then the retired link is not left behind in the browser history', () => {
      const entriesBefore = window.history.length;
      land('/checkout', `?planId=${RETIRED_PLAN_ID}`);

      rewriteDeprecatedPlanId(DEPRECATED_PLAN_IDS);

      expect(window.history).toHaveLength(entriesBefore);
    });
  });

  describe('When the retired price arrives on a nested checkout route or under a base path', () => {
    it('Then a checkout subroute still opens with the price that replaced it', () => {
      land('/checkout/success', `?planId=${RETIRED_PLAN_ID}`);

      rewriteDeprecatedPlanId(DEPRECATED_PLAN_IDS);

      expect(new URLSearchParams(window.location.search).get('planId')).toBe(CURRENT_PLAN_ID);
    });

    it('Then a deployment served under a base path still opens with the price that replaced it', () => {
      land('/drive/checkout', `?planId=${RETIRED_PLAN_ID}`);

      rewriteDeprecatedPlanId(DEPRECATED_PLAN_IDS);

      expect(new URLSearchParams(window.location.search).get('planId')).toBe(CURRENT_PLAN_ID);
    });
  });

  describe('When the checkout is opened with a price that is still on sale', () => {
    it('Then the address bar is left untouched', () => {
      land('/checkout', `?planId=${ACTIVE_PLAN_ID}&couponCode=SPECIAL`);

      rewriteDeprecatedPlanId(DEPRECATED_PLAN_IDS);

      expect(window.location.search).toBe(`?planId=${ACTIVE_PLAN_ID}&couponCode=SPECIAL`);
    });
  });

  describe('When the checkout is opened without any price', () => {
    it('Then the address bar is left untouched', () => {
      land('/checkout', '?couponCode=SPECIAL');

      rewriteDeprecatedPlanId(DEPRECATED_PLAN_IDS);

      expect(window.location.search).toBe('?couponCode=SPECIAL');
    });
  });

  describe('When a retired price arrives on a view that is not the checkout', () => {
    it('Then the address bar is left untouched', () => {
      land('/login', `?planId=${RETIRED_PLAN_ID}`);

      rewriteDeprecatedPlanId(DEPRECATED_PLAN_IDS);

      expect(window.location.search).toBe(`?planId=${RETIRED_PLAN_ID}`);
    });

    it('Then a path that merely begins with the checkout word is left untouched', () => {
      land('/checkout-something-else', `?planId=${RETIRED_PLAN_ID}`);

      rewriteDeprecatedPlanId(DEPRECATED_PLAN_IDS);

      expect(window.location.search).toBe(`?planId=${RETIRED_PLAN_ID}`);
    });
  });

  describe('When the price in the address bar names an inherited object property', () => {
    it('Then it is not treated as a retired price', () => {
      land('/checkout', '?planId=toString');

      rewriteDeprecatedPlanId(DEPRECATED_PLAN_IDS);

      expect(window.location.search).toBe('?planId=toString');
    });
  });

  describe('When the retired prices catalogue is read', () => {
    it('Then the price of the ended campaign points to its replacement', () => {
      expect(DEPRECATED_PLAN_IDS['price_1T1xQtFAOdcgaBMQ1r2JnHsE']).toBe('price_1U6Ev3FAOdcgaBMQHxOAmWPO');
    });
  });
});
