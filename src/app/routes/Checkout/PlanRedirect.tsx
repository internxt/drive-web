import { ReactNode } from 'react';
import { Redirect, matchPath, useLocation } from 'react-router-dom';

const CHECKOUT_PATH = '/checkout';

export type CouponRule = 'unlessBlocked' | 'onlyIfAllowed' | 'onlyCouponCode';

export interface RedirectPlan {
  targetPlanId: string;
  couponRule: CouponRule;
  couponCode?: string;
}

export const REDIRECT_PLANS: Readonly<Record<string, RedirectPlan>> = {
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
    couponRule: 'unlessBlocked',
  },
  price_1TRoAJFAOdcgaBMQveT6cebN: {
    targetPlanId: 'price_1UZCCZFAOdcgaBMQO9bKb6I9',
    couponRule: 'unlessBlocked',
  },
  price_1UKYnMFAOdcgaBMQ09GLzJhJ: {
    targetPlanId: 'price_1UZCCZFAOdcgaBMQO9bKb6I9',
    couponRule: 'unlessBlocked',
  },
};

export const REDIRECT_BLOCKING_COUPON_CODES: ReadonlySet<string> = new Set([]);
export const REDIRECT_ALLOWED_COUPON_CODES: ReadonlySet<string> = new Set([
  'SPECIAL',
  'WEWE',
  'GOTZHAOFFER',
  'TFA',
  'REOFFER',
  'AFFIOFFER',
]);

function getCouponCode(search: string): string {
  return new URLSearchParams(search).get('couponCode')?.trim().toUpperCase() ?? '';
}

function canRedirect(plan: RedirectPlan, couponCode: string): boolean {
  if (plan.couponRule === 'onlyCouponCode') {
    return plan.couponCode === couponCode;
  }

  return plan.couponRule === 'unlessBlocked'
    ? !REDIRECT_BLOCKING_COUPON_CODES.has(couponCode)
    : REDIRECT_ALLOWED_COUPON_CODES.has(couponCode);
}

function getRedirectPlanIdSearch(
  search: string,
  plans: Readonly<Record<string, RedirectPlan>> = REDIRECT_PLANS,
): string | null {
  const params = new URLSearchParams(search);
  const planId = params.get('planId');

  if (!planId || !Object.hasOwn(plans, planId)) {
    return null;
  }

  const plan = plans[planId];

  if (!canRedirect(plan, getCouponCode(search))) {
    return null;
  }

  params.set('planId', plan.targetPlanId);

  return `?${params}`;
}

const PlanIdRedirect = ({ children }: { children: ReactNode }): JSX.Element => {
  const location = useLocation();
  const isCheckout = matchPath(location.pathname, { path: CHECKOUT_PATH }) !== null;
  const search = isCheckout ? getRedirectPlanIdSearch(location.search) : null;

  if (search) {
    return <Redirect to={{ pathname: location.pathname, search, hash: location.hash, state: location.state }} />;
  }

  return <>{children}</>;
};

export default PlanIdRedirect;
