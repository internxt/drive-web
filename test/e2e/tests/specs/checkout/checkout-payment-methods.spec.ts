import { test } from '@playwright/test';
import { blockThirdParty } from '../../helper/blockThirdParty';
import { buildLifetimePrice, buildMonthlyPrice, mockCheckoutAPIs } from '../../helper/checkoutMocks';
import { stubBrowserGlobals } from '../../helper/initScripts';
import { CheckoutPage } from '../../pages/checkoutPage';

/**
 * Guards `payment_method_types` in `checkout.service.ts`, which offers `['card', 'paypal']` and adds
 * `'klarna'` for lifetime plans priced in EUR.
 *
 * These assertions are cheap but not vacuous: the mocked suite loads real Stripe.js with the test
 * publishable key, so the accordion is rendered from the account's live payment-method settings
 * intersected with what the app requests. Dropping a method from `payment_method_types` — or losing
 * it in the Stripe dashboard — makes them fail. Driving a method to completion needs a real client
 * secret and belongs to the smoke suite.
 */
test.describe('checkout - available payment methods', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await blockThirdParty(page);
    await stubBrowserGlobals(page);
  });

  test('TC1: offers card and PayPal on a subscription plan', async ({ page }) => {
    const monthly = buildMonthlyPrice();
    await mockCheckoutAPIs(page, { price: monthly });

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: monthly.price.id });
    await checkout.waitForCheckoutReady();

    await checkout.expectPaymentMethodAvailable('Card');
    await checkout.expectPaymentMethodAvailable('PayPal');
  });

  test('TC2: adds Klarna on a lifetime plan priced in EUR', async ({ page }) => {
    const lifetime = buildLifetimePrice({ currency: 'eur' });
    await mockCheckoutAPIs(page, { price: lifetime });

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: lifetime.price.id });
    await checkout.waitForCheckoutReady();

    await checkout.expectPaymentMethodAvailable('Card');
    await checkout.expectPaymentMethodAvailable('PayPal');
    await checkout.expectPaymentMethodAvailable('Klarna');
  });

  test('TC3: expanding the PayPal item keeps the pay button usable', async ({ page }) => {
    const monthly = buildMonthlyPrice();
    await mockCheckoutAPIs(page, { price: monthly });

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: monthly.price.id });
    await checkout.waitForCheckoutReady();

    // Selecting a redirect method collapses the card form; `onStripePaymentExpanded` also refetches
    // the price, so this asserts that churn leaves checkout in a submittable state.
    await checkout.selectPaymentMethod('PayPal');

    await checkout.waitForCheckoutReady();
  });
});
