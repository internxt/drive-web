import { Page } from '@playwright/test';

/**
 * Analytics / marketing hosts that checkout loads but that contribute nothing to the assertions.
 * Aborting them removes several seconds of network wait and a class of cross-test flake.
 *
 * Stripe domains are deliberately absent: `js.stripe.com`, `api.stripe.com`, `m.stripe.network` and
 * `r.stripe.com` must stay reachable, because the card fields are real Stripe iframes and
 * `createConfirmationToken` is a real (free) test-mode call.
 */
const BLOCKED_HOST_FRAGMENTS = [
  'googletagmanager.com',
  'google-analytics.com',
  'analytics.google.com',
  'googleadservices.com',
  'doubleclick.net',
  'connect.facebook.net',
  'facebook.com/tr',
  'mailerlite.com',
  'cello.so',
  'assets.cello.so',
  'intercom.io',
  'intercomcdn.com',
  'rudderlabs.com',
  'sentry.internxt.com',
  'gstatic.com/recaptcha',
  'google.com/recaptcha',
];

const envHostFragments = (): string[] =>
  [process.env.REACT_APP_IMPACT_API, process.env.REACT_APP_GSHEET_API, process.env.REACT_APP_CDP_DATA_PLANE]
    .filter((value): value is string => !!value && value.startsWith('http'))
    .map((value) => value.replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
    .filter((host) => host.length > 0);

/**
 * Aborts third-party analytics requests. Register before `page.goto`.
 */
export const blockThirdParty = async (page: Page): Promise<void> => {
  const fragments = [...BLOCKED_HOST_FRAGMENTS, ...envHostFragments()];

  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const isBlocked = fragments.some((fragment) => url.includes(fragment));

    if (isBlocked) {
      return route.abort();
    }

    return route.fallback();
  });
};
