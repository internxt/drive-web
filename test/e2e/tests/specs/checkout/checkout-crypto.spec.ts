import { expect, test } from '@playwright/test';
import { blockThirdParty } from '../../helper/blockThirdParty';
import {
  CHECKOUT_ENDPOINTS,
  buildLifetimePrice,
  buildMonthlyPrice,
  buildPaymentIntentCrypto,
  mockCheckoutAPIs,
  mockInlineSignUp,
} from '../../helper/checkoutMocks';
import { stubBrowserGlobals } from '../../helper/initScripts';
import { CheckoutPage } from '../../pages/checkoutPage';

const EMAIL = 'e2e-checkout-crypto@internxt.com';
const PASSWORD = 'Str0ngE2EPassw0rd!';
const LIFETIME_PLAN = buildLifetimePrice();

const BILLING_ADDRESS = {
  name: 'E2E Tester',
  country: 'ES',
  line1: 'Gran Via 1',
  city: 'Madrid',
  postalCode: '28001',
};

/** Drives a lifetime plan all the way to the crypto payment dialog. */
const payWithCrypto = async (checkout: CheckoutPage) => {
  await checkout.selectCryptoCurrency('btc', 'Bitcoin');
  // `isCryptoAddressIncomplete` blocks the submit until name, line 1, city, country and postal code
  // are all present.
  await checkout.fillBillingAddress(BILLING_ADDRESS);
  await checkout.fillCredentials(EMAIL, PASSWORD);
  await checkout.clickPay();
};

test.describe('checkout - crypto payment', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await blockThirdParty(page);
    await stubBrowserGlobals(page);
    await mockInlineSignUp(page, { email: EMAIL, password: PASSWORD });
  });

  test('TC1: the crypto section is only offered for lifetime plans', async ({ page }) => {
    const monthlyPlan = buildMonthlyPrice();
    await mockCheckoutAPIs(page, { price: monthlyPlan });

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: monthlyPlan.price.id });
    await checkout.waitForCheckoutReady();
    await checkout.waitForStripeReady();

    await expect(checkout.cryptoSection).toHaveCount(0);
  });

  test('TC2: paying with crypto opens the invoice dialog with a QR code and a running countdown', async ({ page }) => {
    await mockCheckoutAPIs(page, {
      price: LIFETIME_PLAN,
      paymentIntent: buildPaymentIntentCrypto(),
    });

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: LIFETIME_PLAN.price.id });
    await checkout.waitForCheckoutReady();

    const paymentIntentRequest = page.waitForRequest((request) =>
      CHECKOUT_ENDPOINTS.createPaymentIntent(new URL(request.url())),
    );

    await payWithCrypto(checkout);

    expect((await paymentIntentRequest).postDataJSON()).toMatchObject({
      priceId: LIFETIME_PLAN.price.id,
      currency: 'btc',
    });

    await expect(checkout.cryptoDialog).toBeVisible();
    await expect(checkout.cryptoDialogQr).toBeVisible();
    await expect(checkout.cryptoDialogAddress).toHaveValue('bc1qmockaddress');

    // The invoice window is 600s, so the countdown starts just under 10:00 and ticks down.
    const firstReading = await checkout.cryptoDialogCountdown.innerText();
    expect(firstReading).toMatch(/^(09|10):\d{2}$/);

    await expect
      .poll(async () => checkout.cryptoDialogCountdown.innerText(), { timeout: 10000 })
      .not.toEqual(firstReading);
  });

  test('TC3: a verified crypto payment sends the user to the success view', async ({ page }) => {
    await mockCheckoutAPIs(page, {
      price: LIFETIME_PLAN,
      paymentIntent: buildPaymentIntentCrypto(),
      cryptoPaymentVerified: true,
    });

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: LIFETIME_PLAN.price.id });
    await checkout.waitForCheckoutReady();
    await payWithCrypto(checkout);

    await expect(checkout.cryptoDialog).toBeVisible();

    const verifyRequest = page.waitForRequest((request) =>
      CHECKOUT_ENDPOINTS.verifyCryptoPayment(new URL(request.url())),
    );

    await checkout.cryptoDialogConfirm.click();
    await verifyRequest;

    await page.waitForURL('**/checkout/success**', { timeout: 30000 });
  });

  test('TC4: an unverified crypto payment shows an error and keeps the dialog open', async ({ page }) => {
    await mockCheckoutAPIs(page, {
      price: LIFETIME_PLAN,
      paymentIntent: buildPaymentIntentCrypto(),
      cryptoPaymentVerified: false,
    });

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: LIFETIME_PLAN.price.id });
    await checkout.waitForCheckoutReady();
    await payWithCrypto(checkout);

    await expect(checkout.cryptoDialog).toBeVisible();
    await checkout.cryptoDialogConfirm.click();

    await checkout.expectToast('Payment is not completed');
    await expect(checkout.cryptoDialog).toBeVisible();
  });
});
