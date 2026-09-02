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

const retiredPlanRuledBy = (couponRule: CouponRule) => {
  const entry = Object.entries(REDIRECT_PLANS).find(([, plan]) => plan.couponRule === couponRule);

  if (!entry) {
    throw new Error(`The catalogue of retired prices has no price ruled by ${couponRule}`);
  }

  return { retiredPlanId: entry[0], currentPlanId: entry[1].targetPlanId };
};

const { retiredPlanId: RETIRED_PLAN_ID, currentPlanId: CURRENT_PLAN_ID } = retiredPlanRuledBy('unlessBlocked');
const { retiredPlanId: COUPON_ONLY_RETIRED_PLAN_ID, currentPlanId: COUPON_ONLY_CURRENT_PLAN_ID } =
  retiredPlanRuledBy('onlyIfAllowed');

const [BLOCKING_COUPON] = REDIRECT_BLOCKING_COUPON_CODES;
const [ALLOWED_COUPON] = REDIRECT_ALLOWED_COUPON_CODES;
const UNLISTED_COUPON = 'A_COUPON_NOBODY_LISTED';
const ACTIVE_PLAN_ID = 'price_1SomeOtherActivePriceId';

const CAMPAIGN_SEARCH =
  `?planId=${RETIRED_PLAN_ID}&couponCode=${ALLOWED_COUPON}&planType=individual&currency=eur&mode=payment` +
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
  test('When the retired price arrives on the checkout, then the checkout opens with the price that replaced it', () => {
    landOn(`/checkout?planId=${RETIRED_PLAN_ID}&couponCode=${ALLOWED_COUPON}`);

    expect(screen.getByTestId(CHECKOUT)).toHaveTextContent(
      `/checkout?planId=${CURRENT_PLAN_ID}&couponCode=${ALLOWED_COUPON}`,
    );
  });

  test('When the retired price arrives from a campaign link, then the coupon and the affiliate attribution survive', () => {
    const history = landOn(`/checkout${CAMPAIGN_SEARCH}`);
    const params = new URLSearchParams(history.location.search);

    expect(params.get('planId')).toBe(CURRENT_PLAN_ID);
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
  });

  test('When the retired price arrives with a coupon that opts out of the redirect, then the address bar is left untouched', () => {
    landOn(`/checkout?planId=${RETIRED_PLAN_ID}&couponCode=${BLOCKING_COUPON}`);

    expect(screen.getByTestId(CHECKOUT)).toHaveTextContent(
      `/checkout?planId=${RETIRED_PLAN_ID}&couponCode=${BLOCKING_COUPON}`,
    );
  });

  test('When a coupon opts out of the redirect, then the retired link is left as it arrived in the browser history', () => {
    const history = landOn(`/checkout?planId=${RETIRED_PLAN_ID}&couponCode=${BLOCKING_COUPON}`);

    expect(history.entries).toHaveLength(1);
    expect(history.action).toBe('POP');
  });

  test('When the coupon that opts out of the redirect is typed in lower case, then it still opts out', () => {
    landOn(`/checkout?planId=${RETIRED_PLAN_ID}&couponCode=${BLOCKING_COUPON.toLowerCase()}`);

    expect(screen.getByTestId(CHECKOUT)).toHaveTextContent(
      `/checkout?planId=${RETIRED_PLAN_ID}&couponCode=${BLOCKING_COUPON.toLowerCase()}`,
    );
  });

  test('When the price that replaced it takes over, then the retired link is not left behind in the browser history', () => {
    const history = landOn(`/checkout?planId=${RETIRED_PLAN_ID}`);

    expect(history.entries).toHaveLength(1);
    expect(history.action).toBe('REPLACE');
  });

  test('When the retired price arrives on a checkout subroute, then that subroute opens with the price that replaced it', () => {
    landOn(`/checkout/success?planId=${RETIRED_PLAN_ID}`);

    expect(screen.getByTestId(CHECKOUT_SUCCESS)).toHaveTextContent(`/checkout/success?planId=${CURRENT_PLAN_ID}`);
  });

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
    landOn(`/login?planId=${RETIRED_PLAN_ID}`);

    expect(screen.getByTestId(ANY_OTHER_VIEW)).toHaveTextContent(`/login?planId=${RETIRED_PLAN_ID}`);
  });

  test('When the retired price arrives on a path that merely begins with the checkout word, then the address bar is left untouched', () => {
    landOn(`/checkout-something-else?planId=${RETIRED_PLAN_ID}`);

    expect(screen.getByTestId(ANY_OTHER_VIEW)).toHaveTextContent(`/checkout-something-else?planId=${RETIRED_PLAN_ID}`);
  });
});

describe('Landing on the checkout with a price that only a campaign coupon can leave behind', () => {
  test('When a campaign coupon comes along, then the checkout opens with the price that replaced it', () => {
    landOn(`/checkout?planId=${COUPON_ONLY_RETIRED_PLAN_ID}&couponCode=${ALLOWED_COUPON}`);

    expect(screen.getByTestId(CHECKOUT)).toHaveTextContent(
      `/checkout?planId=${COUPON_ONLY_CURRENT_PLAN_ID}&couponCode=${ALLOWED_COUPON}`,
    );
  });

  test('When the campaign coupon is typed in lower case, then the checkout still opens with the price that replaced it', () => {
    landOn(`/checkout?planId=${COUPON_ONLY_RETIRED_PLAN_ID}&couponCode=${ALLOWED_COUPON.toLowerCase()}`);

    expect(screen.getByTestId(CHECKOUT)).toHaveTextContent(`planId=${COUPON_ONLY_CURRENT_PLAN_ID}`);
  });

  test('When a coupon outside the campaign comes along, then the address bar is left untouched', () => {
    const history = landOn(`/checkout?planId=${COUPON_ONLY_RETIRED_PLAN_ID}&couponCode=${UNLISTED_COUPON}`);

    expect(screen.getByTestId(CHECKOUT)).toHaveTextContent(
      `/checkout?planId=${COUPON_ONLY_RETIRED_PLAN_ID}&couponCode=${UNLISTED_COUPON}`,
    );
    expect(history.entries).toHaveLength(1);
    expect(history.action).toBe('POP');
  });

  test('When the coupon that opts out of the other retired price comes along, then the address bar is left untouched', () => {
    landOn(`/checkout?planId=${COUPON_ONLY_RETIRED_PLAN_ID}&couponCode=${BLOCKING_COUPON}`);

    expect(screen.getByTestId(CHECKOUT)).toHaveTextContent(
      `/checkout?planId=${COUPON_ONLY_RETIRED_PLAN_ID}&couponCode=${BLOCKING_COUPON}`,
    );
  });

  test('When no coupon comes along at all, then the address bar is left untouched', () => {
    const history = landOn(`/checkout?planId=${COUPON_ONLY_RETIRED_PLAN_ID}`);

    expect(screen.getByTestId(CHECKOUT)).toHaveTextContent(`/checkout?planId=${COUPON_ONLY_RETIRED_PLAN_ID}`);
    expect(history.entries).toHaveLength(1);
    expect(history.action).toBe('POP');
  });

  test('When an empty coupon comes along, then the address bar is left untouched', () => {
    landOn(`/checkout?planId=${COUPON_ONLY_RETIRED_PLAN_ID}&couponCode=`);

    expect(screen.getByTestId(CHECKOUT)).toHaveTextContent(`planId=${COUPON_ONLY_RETIRED_PLAN_ID}`);
  });
});

describe('Reading the catalogue of retired prices', () => {
  test('When the price of the ended campaign is read, then it points to its replacement and any coupon but the blocking one lets it go', () => {
    expect(REDIRECT_PLANS['price_1T1xQtFAOdcgaBMQ1r2JnHsE']).toEqual({
      targetPlanId: 'price_1UAwSbFAOdcgaBMQkJhPExCz',
      couponRule: 'unlessBlocked',
    });
  });

  test('When the price kept alive by the campaign is read, then it points to its replacement and only the listed coupons let it go', () => {
    expect(REDIRECT_PLANS['price_1TRoAJFAOdcgaBMQveT6cebN']).toEqual({
      targetPlanId: 'price_1UAsSAFAOdcgaBMQNF0j8UfV',
      couponRule: 'onlyIfAllowed',
    });
  });
});