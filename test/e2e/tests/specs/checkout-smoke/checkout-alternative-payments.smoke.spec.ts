import { expect, test } from '@playwright/test';
import { blockThirdParty } from '../../helper/blockThirdParty';
import { stubBrowserGlobals } from '../../helper/initScripts';
import { SMOKE_ENV, SUCCESS_TIMEOUT, disposableEmail, skipUnlessSmokeConfigured } from '../../helper/smokeConfig';
import { mockSmokeSignUp, mockUserLocation } from '../../helper/smokeSetup';
import { CheckoutPage } from '../../pages/checkoutPage';

/**
 * The purchase paths that leave the checkout page: a redirect payment method (PayPal) and a card
 * that forces a 3-D Secure challenge. Neither can be covered by the mocked suite — both need a real
 * client secret, because the interesting part only happens inside `stripe.confirmPayment`.
 *
 * See `README.md` in this directory for the environment these need.
 */

/** Always requires authentication; see https://docs.stripe.com/testing#3ds-cards. */
const THREE_DS_CARD = '4000002760003184';

test.describe.configure({ mode: 'serial' });

test.describe('checkout smoke - redirect and challenge flows', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  skipUnlessSmokeConfigured();

  test.beforeEach(async ({ page }) => {
    await blockThirdParty(page);
    await stubBrowserGlobals(page);
    await mockUserLocation(page);
  });

  test('TC1: paying with PayPal authorises on the Stripe simulator and returns to /checkout/success', async ({
    page,
  }) => {
    const checkout = new CheckoutPage(page);
    const email = disposableEmail();

    await mockSmokeSignUp(page, { email, password: SMOKE_ENV.password, jwtSecret: SMOKE_ENV.jwtSecret });

    await checkout.gotoCheckout({ planId: SMOKE_ENV.monthlyPriceId });
    await checkout.waitForCheckoutReady();

    await checkout.selectPaymentMethod('PayPal');
    await checkout.fillCredentials(email, SMOKE_ENV.password);
    await checkout.clickPay();

    // Test mode never reaches PayPal itself: Stripe hosts the authorisation step.
    await checkout.authorizeRedirectTestPayment('authorize');

    await page.waitForURL('**/checkout/success**', { timeout: SUCCESS_TIMEOUT });
  });

  test('TC2: a card that requires authentication completes the 3-D Secure challenge', async ({ page }) => {
    const checkout = new CheckoutPage(page);
    const email = disposableEmail();

    await mockSmokeSignUp(page, { email, password: SMOKE_ENV.password, jwtSecret: SMOKE_ENV.jwtSecret });

    await checkout.gotoCheckout({ planId: SMOKE_ENV.monthlyPriceId });
    await checkout.waitForCheckoutReady();

    await checkout.fillCredentials(email, SMOKE_ENV.password);
    await checkout.fillCardDetails({ number: THREE_DS_CARD });
    await checkout.clickPay();

    await checkout.completeThreeDSChallenge('complete');

    await page.waitForURL('**/checkout/success**', { timeout: SUCCESS_TIMEOUT });
  });

  test('TC3: a failed 3-D Secure challenge keeps the user on checkout with the pay button usable', async ({ page }) => {
    const checkout = new CheckoutPage(page);
    const email = disposableEmail();

    await mockSmokeSignUp(page, { email, password: SMOKE_ENV.password, jwtSecret: SMOKE_ENV.jwtSecret });

    await checkout.gotoCheckout({ planId: SMOKE_ENV.monthlyPriceId });
    await checkout.waitForCheckoutReady();

    await checkout.fillCredentials(email, SMOKE_ENV.password);
    await checkout.fillCardDetails({ number: THREE_DS_CARD });
    await checkout.clickPay();

    await checkout.completeThreeDSChallenge('fail');

    // `confirmStripePaymentIntent` rethrows the Stripe error, which `onCheckoutButtonClicked`
    // surfaces as a toast before re-enabling the form.
    await expect(checkout.payButton).toBeEnabled({ timeout: SUCCESS_TIMEOUT });
    expect(page.url()).toContain('/checkout');
    expect(page.url()).not.toContain('/checkout/success');
  });
});
