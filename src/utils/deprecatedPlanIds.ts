
export const DEPRECATED_PLAN_IDS: Readonly<Record<string, string>> = {
  price_1T1xQtFAOdcgaBMQ1r2JnHsE: 'price_1U6Ev3FAOdcgaBMQHxOAmWPO',
};


export function rewriteDeprecatedPlanId(deprecatedPlanIds: Record<string, string>): void {
  const currentLocation = window.location;

  if (!/(^|\/)checkout(\/|$)/.test(currentLocation.pathname)) {
    return;
  }

  const params = new URLSearchParams(currentLocation.search);
  const planId = params.get('planId');

  if (!planId || !Object.prototype.hasOwnProperty.call(deprecatedPlanIds, planId)) {
    return;
  }

  params.set('planId', deprecatedPlanIds[planId]);
  window.history.replaceState(
    window.history.state,
    '',
    currentLocation.pathname + '?' + params + currentLocation.hash,
  );
}
