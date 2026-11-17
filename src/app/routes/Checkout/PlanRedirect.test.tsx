import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Route, Router, Switch, useLocation } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import PlanRedirect, {
  CouponRule,
  REDIRECT_PLANS,
  REDIRECT_ALLOWED_COUPON_CODES,
  REDIRECT_BLOCKING_COUPON_CODES,
} from './PlanRedirect';

const retiredPlansRuledBy = (couponRule: CouponRule) => {
  const plans = Object.entries(REDIRECT_PLANS)
    .filter(([, plan]) => plan.couponRule === couponRule)
    .map(([retiredPlanId, plan]) => ({
      retiredPlanId,
      currentPlanId: plan.targetPlanId,
    }));

  if (plans.length === 0) {
    throw new Error(`The catalogue of retired prices has no price ruled by ${couponRule}`);
  }

  return plans;
};

const RETIRED_PLANS_UNLESS_BLOCKED = retiredPlansRuledBy('unlessBlocked');
const RETIRED_PLANS_ONLY_IF_ALLOWED = retiredPlansRuledBy('onlyIfAllowed');
const RETIRED_PLANS = [...RETIRED_PLANS_UNLESS_BLOCKED, ...RETIRED_PLANS_ONLY_IF_ALLOWED];

const [{ retiredPlanId: ANY_RETIRED_PLAN_ID }] = RETIRED_PLANS_UNLESS_BLOCKED;

const blockedLandingsOn = (plans: typeof RETIRED_PLANS) =>
  plans.flatMap(({ retiredPlanId }) =>
    [...REDIRECT_BLOCKING_COUPON_CODES].map((blockingCoupon) => ({ retiredPlanId, blockingCoupon })),
  );

const allowedLandingsOn = (plans: typeof RETIRED_PLANS) =>
  plans.flatMap(({ retiredPlanId, currentPlanId }) =>
    [...REDIRECT_ALLOWED_COUPON_CODES].map((allowedCoupon) => ({ retiredPlanId, currentPlanId, allowedCoupon })),
  );

const [ALLOWED_COUPON] = REDIRECT_ALLOWED_COUPON_CODES;
const UNLISTED_COUPON = 'SOMEOTHERCOUPON';
const ACTIVE_PLAN_ID = 'price_1SomeOtherActivePriceId';

const campaignSearchFor = (retiredPlanId: string) =>
  `?planId=${retiredPlanId}&couponCode=${ALLOWED_COUPON}&planType=individual&currency=eur&mode=payment` +
  '&irclickid=VDATvXyxdxyZRKTUCo0LBx1tUkr0ecwVAzMh2U0&irgwc=1&afsrc=1&utm_source=Impact' +
  '&utm_medium=referral&utm_campaign=312695';

const CHECKOUT = 'checkout';
const CHECKOUT_SUCCESS = 'checkout-success';
const ANY_OTHER_VIEW = 'any-other-view';

const OpenedUrl = ({ view }: { view: string }) => {
  const location = useLocation();

  return <span data-testid={view}>{location.pathname + location.search}</span>;
};

const landOn = (url: string) => {
  const history = createMemoryHistory({ initialEntries: [url] });

  render(
    <Router history={history}>
      <PlanRedirect>
        <Switch>
          <Route path="/checkout/success">
            <OpenedUrl view={CHECKOUT_SUCCESS} />
          </Route>
          <Route path="/checkout">
            <OpenedUrl view={CHECKOUT} />
          </Route>
          <Route path="*">
            <OpenedUrl view={ANY_OTHER_VIEW} />
          </Route>
        </Switch>
      </PlanRedirect>
    </Router>,
  );

  return history;
};

describe('Landing on the checkout with a price that is no longer on sale', () => {
  test.each(RETIRED_PLANS)(
    'When the retired price $retiredPlanId arrives on the checkout, then the checkout opens with the price that replaced it',
    ({ retiredPlanId, currentPlanId }) => {
      landOn(`/checkout?planId=${retiredPlanId}&couponCode=${ALLOWED_COUPON}`);

      expect(screen.getByTestId(CHECKOUT)).toHaveTextContent(
        `/checkout?planId=${currentPlanId}&couponCode=${ALLOWED_COUPON}`,
      );
    },
  );

  test.each(RETIRED_PLANS)(
    'When the retired price $retiredPlanId arrives from a campaign link, then the coupon and the affiliate attribution survive',
    ({ retiredPlanId, currentPlanId }) => {
      const history = landOn(`/checkout${campaignSearchFor(retiredPlanId)}`);
      const params = new URLSearchParams(history.location.search);

      expect(params.get('planId')).toBe(currentPlanId);
      expect(params.get('couponCode')).toBe(ALLOWED_COUPON);
      expect(params.get('planType')).toBe('individual');
      expect(params.get('currency')).toBe('eur');
      expect(params.get('mode')).toBe('payment');
      expect(params.get('irclickid')).toBe('VDATvXyxdxyZRKTUCo0LBx1tUkr0ecwVAzMh2U0');
      expect(params.get('irgwc')).toBe('1');
      expect(params.get('afsrc')).toBe('1');
      expect(params.get('utm_source')).toBe('Impact');
      expect(params.get('utm_medium')).toBe('referral');
      expect(params.get('utm_campaign')).toBe('312695');
    },
  );

  test.each(RETIRED_PLANS_UNLESS_BLOCKED)(
    'When the retired price $retiredPlanId, which moves unless a coupon blocks it, arrives without any coupon, then the checkout opens with the price that replaced it',
    ({ retiredPlanId, currentPlanId }) => {
      landOn(`/checkout?planId=${retiredPlanId}`);

      expect(screen.getByTestId(CHECKOUT)).toHaveTextContent(`/checkout?planId=${currentPlanId}`);
    },
  );

  test.each(blockedLandingsOn(RETIRED_PLANS_UNLESS_BLOCKED))(
    'When the retired price $retiredPlanId arrives with $blockingCoupon, the coupon that opts out of the redirect, then the address bar is left untouched',
    ({ retiredPlanId, blockingCoupon }) => {
      landOn(`/checkout?planId=${retiredPlanId}&couponCode=${blockingCoupon}`);

      expect(screen.getByTestId(CHECKOUT)).toHaveTextContent(
        `/checkout?planId=${retiredPlanId}&couponCode=${blockingCoupon}`,
      );
    },
  );

  test.each(blockedLandingsOn(RETIRED_PLANS_UNLESS_BLOCKED))(
    'When $blockingCoupon opts out of the redirect of $retiredPlanId, then the retired link is left as it arrived in the browser history',
    ({ retiredPlanId, blockingCoupon }) => {
      const history = landOn(`/checkout?planId=${retiredPlanId}&couponCode=${blockingCoupon}`);

      expect(history.entries).toHaveLength(1);
      expect(history.action).toBe('POP');
    },
  );

  test.each(blockedLandingsOn(RETIRED_PLANS_UNLESS_BLOCKED))(
    'When $blockingCoupon, the coupon that opts out of the redirect of $retiredPlanId, is typed in lower case, then it still opts out',
    ({ retiredPlanId, blockingCoupon }) => {
      landOn(`/checkout?planId=${retiredPlanId}&couponCode=${blockingCoupon.toLowerCase()}`);

      expect(screen.getByTestId(CHECKOUT)).toHaveTextContent(
        `/checkout?planId=${retiredPlanId}&couponCode=${blockingCoupon.toLowerCase()}`,
      );
    },
  );

  test.each(allowedLandingsOn(RETIRED_PLANS_ONLY_IF_ALLOWED))(
    'When the retired price $retiredPlanId, which only moves under an allowed coupon, arrives with $allowedCoupon, then the checkout opens with the price that replaced it',
    ({ retiredPlanId, currentPlanId, allowedCoupon }) => {
      landOn(`/checkout?planId=${retiredPlanId}&couponCode=${allowedCoupon}`);

      expect(screen.getByTestId(CHECKOUT)).toHaveTextContent(
        `/checkout?planId=${currentPlanId}&couponCode=${allowedCoupon}`,
      );
    },
  );

  test.each(allowedLandingsOn(RETIRED_PLANS_ONLY_IF_ALLOWED))(
    'When $allowedCoupon, a coupon that lets $retiredPlanId move, is typed in lower case, then it still lets it move',
    ({ retiredPlanId, currentPlanId, allowedCoupon }) => {
      landOn(`/checkout?planId=${retiredPlanId}&couponCode=${allowedCoupon.toLowerCase()}`);

      expect(screen.getByTestId(CHECKOUT)).toHaveTextContent(
        `/checkout?planId=${currentPlanId}&couponCode=${allowedCoupon.toLowerCase()}`,
      );
    },
  );

  test.each(RETIRED_PLANS_ONLY_IF_ALLOWED)(
    'When the retired price $retiredPlanId, which only moves under an allowed coupon, arrives without any coupon, then the address bar is left untouched',
    ({ retiredPlanId }) => {
      const history = landOn(`/checkout?planId=${retiredPlanId}`);

      expect(screen.getByTestId(CHECKOUT)).toHaveTextContent(`/checkout?planId=${retiredPlanId}`);
      expect(history.entries).toHaveLength(1);
      expect(history.action).toBe('POP');
    },
  );

  test.each(RETIRED_PLANS_ONLY_IF_ALLOWED)(
    'When the retired price $retiredPlanId, which only moves under an allowed coupon, arrives with a coupon that is on no list, then the address bar is left untouched',
    ({ retiredPlanId }) => {
      const history = landOn(`/checkout?planId=${retiredPlanId}&couponCode=${UNLISTED_COUPON}`);

      expect(screen.getByTestId(CHECKOUT)).toHaveTextContent(
        `/checkout?planId=${retiredPlanId}&couponCode=${UNLISTED_COUPON}`,
      );
      expect(history.entries).toHaveLength(1);
      expect(history.action).toBe('POP');
    },
  );

  test.each(RETIRED_PLANS)(
    'When the price that replaced $retiredPlanId takes over, then the retired link is not left behind in the browser history',
    ({ retiredPlanId }) => {
      const history = landOn(`/checkout?planId=${retiredPlanId}&couponCode=${ALLOWED_COUPON}`);

      expect(history.entries).toHaveLength(1);
      expect(history.action).toBe('REPLACE');
    },
  );

  test.each(RETIRED_PLANS)(
    'When the retired price $retiredPlanId arrives on a checkout subroute, then that subroute opens with the price that replaced it',
    ({ retiredPlanId, currentPlanId }) => {
      landOn(`/checkout/success?planId=${retiredPlanId}&couponCode=${ALLOWED_COUPON}`);

      expect(screen.getByTestId(CHECKOUT_SUCCESS)).toHaveTextContent(
        `/checkout/success?planId=${currentPlanId}&couponCode=${ALLOWED_COUPON}`,
      );
    },
  );

  test('When the checkout is opened with a price that is still on sale, then the address bar is left untouched', () => {
    const history = landOn(`/checkout?planId=${ACTIVE_PLAN_ID}`);

    expect(screen.getByTestId(CHECKOUT)).toHaveTextContent(`/checkout?planId=${ACTIVE_PLAN_ID}`);
    expect(history.entries).toHaveLength(1);
    expect(history.action).toBe('POP');
  });

  test('When the checkout is opened without any price, then the address bar is left untouched', () => {
    landOn(`/checkout?couponCode=${ALLOWED_COUPON}`);

    expect(screen.getByTestId(CHECKOUT)).toHaveTextContent(`/checkout?couponCode=${ALLOWED_COUPON}`);
  });

  test('When the price in the address bar names an inherited object property, then it is not treated as a retired price', () => {
    landOn('/checkout?planId=toString');

    expect(screen.getByTestId(CHECKOUT)).toHaveTextContent('/checkout?planId=toString');
  });

  test('When the retired price arrives on a view that is not the checkout, then the address bar is left untouched', () => {
    landOn(`/login?planId=${ANY_RETIRED_PLAN_ID}`);

    expect(screen.getByTestId(ANY_OTHER_VIEW)).toHaveTextContent(`/login?planId=${ANY_RETIRED_PLAN_ID}`);
  });

  test('When the retired price arrives on a path that merely begins with the checkout word, then the address bar is left untouched', () => {
    landOn(`/checkout-something-else?planId=${ANY_RETIRED_PLAN_ID}`);

    expect(screen.getByTestId(ANY_OTHER_VIEW)).toHaveTextContent(
      `/checkout-something-else?planId=${ANY_RETIRED_PLAN_ID}`,
    );
  });
});

describe('Reading the catalogue of retired prices', () => {
  // The ids and the codes below are spelled out on purpose: these are the only tests that notice a
  // price or a coupon code being added to or dropped from the catalogue, so a change to either one
  // has to be declared here to pass.
  test('When the whole catalogue is read, then every retired price on it points to its replacement under a known coupon rule', () => {
    expect(REDIRECT_PLANS).toEqual({
      price_1T1xQtFAOdcgaBMQ1r2JnHsE: {
        targetPlanId: 'price_1U6Ev3FAOdcgaBMQHxOAmWPO',
        couponRule: 'unlessBlocked',
      },
      price_1UAwSbFAOdcgaBMQkJhPExCz: {
        targetPlanId: 'price_1U6Ev3FAOdcgaBMQHxOAmWPO',
        couponRule: 'unlessBlocked',
      },
      price_1UAsSAFAOdcgaBMQNF0j8UfV: {
        targetPlanId: 'price_1UZCCZFAOdcgaBMQO9bKb6I9',
        couponRule: 'onlyIfAllowed',
      },
      price_1TRoAJFAOdcgaBMQveT6cebN: {
        targetPlanId: 'price_1UZCCZFAOdcgaBMQO9bKb6I9',
        couponRule: 'onlyIfAllowed',
      },
      price_1UKYnMFAOdcgaBMQ09GLzJhJ: {
        targetPlanId: 'price_1UZCCZFAOdcgaBMQO9bKb6I9',
        couponRule: 'onlyIfAllowed',
      },
    });
  });

  test('When the lists of coupon codes are read, then they hold the codes that rule the redirects today', () => {
    expect([...REDIRECT_BLOCKING_COUPON_CODES]).toEqual([]);
    expect([...REDIRECT_ALLOWED_COUPON_CODES]).toEqual([
      'SPECIAL',
      'WEWE',
      'GOTZHAOFFER',
      'TFA',
      'REOFFER',
      'AFFIOFFER',
      'AMIOFFER',
      'VIPOFFER',
      'IDSOFFER',
      'MAXOFFER',
    ]);
  });

  test('When a retired price is ruled by its own coupon, then it names that coupon in upper case', () => {
    Object.values(REDIRECT_PLANS)
      .filter(({ couponRule }) => couponRule === 'onlyCouponCode')
      .forEach(({ couponCode }) => {
        expect(couponCode).toBeTruthy();
        expect(couponCode).toBe(couponCode?.toUpperCase());
      });
  });

  test('When a retired price is ruled by one of the shared coupon lists, then it names no coupon of its own', () => {
    Object.values(REDIRECT_PLANS)
      .filter(({ couponRule }) => couponRule !== 'onlyCouponCode')
      .forEach(({ couponCode }) => {
        expect(couponCode).toBeUndefined();
      });
  });

  test('When the price that replaced a retired one is itself retired, then following the chain still ends on a price that is on sale', () => {
    Object.keys(REDIRECT_PLANS).forEach((retiredPlanId) => {
      const visitedPlanIds = new Set([retiredPlanId]);
      let planId = REDIRECT_PLANS[retiredPlanId].targetPlanId;

      while (Object.hasOwn(REDIRECT_PLANS, planId)) {
        expect(visitedPlanIds.has(planId)).toBe(false);
        visitedPlanIds.add(planId);
        planId = REDIRECT_PLANS[planId].targetPlanId;
      }
    });
  });

  test('When several retired prices were replaced by the same one, then they are all allowed to point at it', () => {
    const targetPlanIds = Object.values(REDIRECT_PLANS).map(({ targetPlanId }) => targetPlanId);

    expect(targetPlanIds.length).toBeGreaterThan(new Set(targetPlanIds).size);
  });
});
