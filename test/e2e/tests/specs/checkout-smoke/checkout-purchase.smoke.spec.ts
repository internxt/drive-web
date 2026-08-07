import { expect, test } from '@playwright/test';
import { blockThirdParty } from '../../helper/blockThirdParty';
import { CHECKOUT_ENDPOINTS } from '../../helper/checkoutMocks';
import { stubBrowserGlobals } from '../../helper/initScripts';
import { SMOKE_ENV, SUCCESS_TIMEOUT, disposableEmail, skipUnlessSmokeConfigured } from '../../helper/smokeConfig';
import { mockSmokeSignUp, mockUserLocation } from '../../helper/smokeSetup';
import { CheckoutPage } from '../../pages/checkoutPage';

/**
 * Real-flow smoke suite: a **real payments service** plus **real Stripe test mode**.
 *
 * There is no deployed staging for payments, so this runs against the local stack
 * (`local-environment/payments`, :8003). Only the drive sign-up and the geo-IP lookup are stubbed —
 * see `helper/smokeSetup.ts` for why neither is part of the integration under test. Customer
 * creation, subscription/payment-intent creation, the Stripe confirmation and the redirect to
 * `/checkout/success` are all real.
 *
 * Setup: see `test/e2e/tests/specs/checkout-smoke/README.md`.
 *
 * Note on volume: payments rate-limits `POST /checkout/customer` to 5 requests per hour per IP
 * (in-memory, so `docker restart payments-api` clears it). Keep the number of purchasing tests
 * under that budget, and restart the container before a full local run.
 */

test.describe.configure({ mode: 'serial' });

test.describe('checkout smoke - real purchase', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  skipUnlessSmokeConfigured();

  test.beforeEach(async ({ page }) => {
    await blockThirdParty(page);
    await stubBrowserGlobals(page);
    await mockUserLocation(page);
  });

  test('TC1: a fresh signup pays a monthly plan with a test card and reaches /checkout/success', async ({ page }) => {
    const checkout = new CheckoutPage(page);
    const email = disposableEmail();

    await mockSmokeSignUp(page, { email, password: SMOKE_ENV.password, jwtSecret: SMOKE_ENV.jwtSecret });

    await checkout.gotoCheckout({ planId: SMOKE_ENV.monthlyPriceId });
    await checkout.waitForCheckoutReady();

    await checkout.fillCredentials(email, SMOKE_ENV.password);
    await checkout.fillCardDetails();
    await checkout.clickPay();

    await page.waitForURL('**/checkout/success**', { timeout: SUCCESS_TIMEOUT });
  });

  test('TC2: a real coupon discounts the UI total and reaches the subscription payload', async ({ page }) => {
    test.skip(
      !SMOKE_ENV.testCoupon,
      'Set SMOKE_TEST_COUPON to a promotion code that exists in the Stripe test account.',
    );

    const checkout = new CheckoutPage(page);
    const email = disposableEmail();

    await mockSmokeSignUp(page, { email, password: SMOKE_ENV.password, jwtSecret: SMOKE_ENV.jwtSecret });

    await checkout.gotoCheckout({ planId: SMOKE_ENV.monthlyPriceId });
    await checkout.waitForCheckoutReady();

    const undiscountedTotal = await checkout.getTotal();
    await checkout.applyCoupon(SMOKE_ENV.testCoupon as string);
    await expect(checkout.discountRow).toBeVisible();
    await expect.poll(async () => checkout.getTotal(), { timeout: 20000 }).not.toEqual(undiscountedTotal);

    await checkout.fillCredentials(email, SMOKE_ENV.password);
    await checkout.fillCardDetails();

    const subscriptionRequest = page.waitForRequest((request) =>
      CHECKOUT_ENDPOINTS.createSubscription(new URL(request.url())),
    );

    await checkout.clickPay();

    const payload = (await subscriptionRequest).postDataJSON();
    expect(payload.promoCodeId, 'the applied coupon must reach the payments API').toBeTruthy();

    await page.waitForURL('**/checkout/success**', { timeout: SUCCESS_TIMEOUT });
  });

  test('TC3: an existing user pays a lifetime plan with a test card', async ({ page }) => {
    test.skip(
      !SMOKE_ENV.lifetimePriceId || !SMOKE_ENV.driveUser.uuid,
      'Set SMOKE_LIFETIME_PRICE_ID, SMOKE_DRIVE_USER_UUID and SMOKE_DRIVE_USER_EMAIL to run the lifetime test.',
    );

    const checkout = new CheckoutPage(page);

    // Unlike the subscription tests this one cannot use a disposable identity: the payment-intent
    // endpoint asks the drive gateway about the user's storage headroom, and the gateway only knows
    // uuids that exist in the drive database.
    const { uuid, email } = SMOKE_ENV.driveUser;

    await mockSmokeSignUp(page, { email, uuid, password: SMOKE_ENV.password, jwtSecret: SMOKE_ENV.jwtSecret });

    await checkout.gotoCheckout({ planId: SMOKE_ENV.lifetimePriceId });
    await checkout.waitForCheckoutReady();

    await checkout.fillCredentials(email, SMOKE_ENV.password);
    await checkout.fillCardDetails();
    await checkout.clickPay();

    await page.waitForURL('**/checkout/success**', { timeout: SUCCESS_TIMEOUT });
  });
});
