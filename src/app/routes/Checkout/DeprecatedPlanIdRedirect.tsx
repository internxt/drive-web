import { ReactNode } from 'react';
import { Redirect, matchPath, useLocation } from 'react-router-dom';

const CHECKOUT_PATH = '/checkout';

export const DEPRECATED_PLAN_IDS: Readonly<Record<string, string>> = {
  price_1T1xQtFAOdcgaBMQ1r2JnHsE: 'price_1U6Ev3FAOdcgaBMQHxOAmWPO',
};

export function getDeprecatedPlanIdSearch(
  search: string,
  deprecatedPlanIds: Record<string, string> = DEPRECATED_PLAN_IDS,
): string | null {
  const params = new URLSearchParams(search);
  const planId = params.get('planId');

  if (!planId || !Object.hasOwn(deprecatedPlanIds, planId)) {
    return null;
  }

  params.set('planId', deprecatedPlanIds[planId]);

  return `?${params}`;
}

const DeprecatedPlanIdRedirect = ({ children }: { children: ReactNode }): JSX.Element => {
  const location = useLocation();
  const isCheckout = matchPath(location.pathname, { path: CHECKOUT_PATH });
  const search = isCheckout ? getDeprecatedPlanIdSearch(location.search) : null;

  if (search) {
    return <Redirect to={{ pathname: location.pathname, search, hash: location.hash, state: location.state }} />;
  }

  return <>{children}</>;
};

export default DeprecatedPlanIdRedirect;
