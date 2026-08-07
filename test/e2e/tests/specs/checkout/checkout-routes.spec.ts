import { expect, test } from '@playwright/test';
import { blockThirdParty } from '../../helper/blockThirdParty';
import { buildMonthlyPrice, mockCheckoutAPIs } from '../../helper/checkoutMocks';
import { stubBrowserGlobals } from '../../helper/initScripts';

const PLAN = buildMonthlyPrice();

test.describe('checkout - routes', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await blockThirdParty(page);
    await stubBrowserGlobals(page);
    await mockCheckoutAPIs(page, { price: PLAN });
  });

  test('TC1: /checkout/success does not strand an unauthenticated visitor', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto('/checkout/success');

    await page.waitForURL((url) => !url.pathname.startsWith('/checkout/success'), { timeout: 30000 });
    expect(pageErrors).toEqual([]);
  });

  test('TC2: /checkout/cancel redirects away from checkout', async ({ page }) => {
    await page.goto('/checkout/cancel');

    await page.waitForURL((url) => !url.pathname.startsWith('/checkout/cancel'), { timeout: 30000 });
  });

  test('TC3: a Stripe session id navigates to the hosted Stripe checkout', async ({ page }) => {
    const stripeRedirects: string[] = [];

    await page.route('https://checkout.stripe.com/**', (route) => {
      stripeRedirects.push(route.request().url());
      return route.abort();
    });

    await page.goto('/checkout/cs_test_a1B2c3D4e5F6g7H8i9J0');

    await expect.poll(() => stripeRedirects.length, { timeout: 30000 }).toBeGreaterThan(0);
    expect(stripeRedirects[0]).toContain('checkout.stripe.com');
  });

  test('TC4: an invalid session id renders nothing and raises no page error', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    let stripeRedirects = 0;
    await page.route('https://checkout.stripe.com/**', (route) => {
      stripeRedirects += 1;
      return route.abort();
    });

    await page.goto('/checkout/not-a-stripe-session');
    await page.waitForLoadState('networkidle');

    expect(stripeRedirects).toEqual(0);
    expect(pageErrors).toEqual([]);
    await expect(page).toHaveURL(/\/checkout\/not-a-stripe-session$/);
  });
});
