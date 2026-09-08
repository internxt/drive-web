import { ReactNode } from 'react';
import { Redirect, matchPath, useLocation } from 'react-router-dom';

const CHECKOUT_PATH = '/checkout';

export type CouponRule = 'unlessBlocked' | 'onlyIfAllowed';

export interface RedirectPlan {
  targetPlanId: string;
  couponRule: CouponRule;
}

export const REDIRECT_PLANS: Readonly<Record<string, RedirectPlan>> = {
  price_1T1xQtFAOdcgaBMQ1r2JnHsE: {
    targetPlanId: 'price_1UAwSbFAOdcgaBMQkJhPExCz',
    couponRule: 'unlessBlocked',
  },
  price_1U6Ev3FAOdcgaBMQHxOAmWPO: {
    targetPlanId: 'price_1UAwSbFAOdcgaBMQkJhPExCz',
    couponRule: 'unlessBlocked',
  },
  price_1TRoAJFAOdcgaBMQveT6cebN: {
    targetPlanId: 'price_1UAsSAFAOdcgaBMQNF0j8UfV',
    couponRule: 'onlyIfAllowed',
  },
};

export const REDIRECT_BLOCKING_COUPON_CODES: ReadonlySet<string> = new Set(['GOTZHAOFFER']);
export const REDIRECT_ALLOWED_COUPON_CODES: ReadonlySet<string> = new Set([
  'SPECIAL',
  'WEWE',
  'GOTZHA',
  'TFA',
  'REOFFER',
]);

function getCouponCode(search: string): string {
  return new URLSearchParams(search).get('couponCode')?.trim().toUpperCase() ?? '';
}

function canRedirect(rule: CouponRule, couponCode: string): boolean {
  return rule === 'unlessBlocked'
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

  const { targetPlanId, couponRule } = plans[planId];

  if (!canRedirect(couponRule, getCouponCode(search))) {
    return null;
  }

  params.set('planId', targetPlanId);

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
