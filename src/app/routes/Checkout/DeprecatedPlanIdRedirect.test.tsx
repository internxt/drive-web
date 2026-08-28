import { render, screen } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import { Route, Router, Switch, useLocation } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import DeprecatedPlanIdRedirect, {
  DEPRECATED_PLAN_IDS,
  REDIRECT_BLOCKING_COUPON_CODES,
} from './DeprecatedPlanIdRedirect';

const [RETIRED_PLAN_ID, CURRENT_PLAN_ID] = Object.entries(DEPRECATED_PLAN_IDS)[0];
const [BLOCKING_COUPON] = REDIRECT_BLOCKING_COUPON_CODES;
const ACTIVE_PLAN_ID = 'price_1SomeOtherActivePriceId';

const CAMPAIGN_SEARCH =
  `?planId=${RETIRED_PLAN_ID}&couponCode=SPECIAL&planType=individual&currency=eur&mode=payment` +
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
      <DeprecatedPlanIdRedirect>
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
      </DeprecatedPlanIdRedirect>
    </Router>,
  );

  return history;
};

describe('Landing on the checkout with a price that is no longer on sale', () => {
  test('When the retired price arrives on the checkout, then the checkout opens with the price that replaced it', () => {
    landOn(`/checkout?planId=${RETIRED_PLAN_ID}&couponCode=SPECIAL`);

    expect(screen.getByTestId(CHECKOUT)).toHaveTextContent(`/checkout?planId=${CURRENT_PLAN_ID}&couponCode=SPECIAL`);
  });

  test('When the retired price arrives from a campaign link, then the coupon and the affiliate attribution survive', () => {
    const history = landOn(`/checkout${CAMPAIGN_SEARCH}`);
    const params = new URLSearchParams(history.location.search);

    expect(params.get('planId')).toBe(CURRENT_PLAN_ID);
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
    landOn('/checkout?couponCode=SPECIAL');

    expect(screen.getByTestId(CHECKOUT)).toHaveTextContent('/checkout?couponCode=SPECIAL');
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

  test('When the retired prices catalogue is read, then the price of the ended campaign points to its replacement', () => {
    expect(DEPRECATED_PLAN_IDS['price_1T1xQtFAOdcgaBMQ1r2JnHsE']).toBe('price_1U6Ev3FAOdcgaBMQHxOAmWPO');
  });
});