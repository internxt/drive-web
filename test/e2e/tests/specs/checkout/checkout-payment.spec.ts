import { Request, expect, test } from '@playwright/test';
import { blockThirdParty } from '../../helper/blockThirdParty';
import {
  CHECKOUT_ENDPOINTS,
  MOCK_CAPTCHA_TOKEN,
  buildCouponCodeData,
  buildCustomerResponse,
  buildLifetimePrice,
  buildMonthlyPrice,
  buildPaidPaymentIntent,
  buildYearlyPrice,
  jsonError,
  mockCheckoutAPIs,
  mockInlineSignUp,
} from '../../helper/checkoutMocks';
import { stubBrowserGlobals } from '../../helper/initScripts';
import { CheckoutPage } from '../../pages/checkoutPage';

const EMAIL = 'e2e-checkout-payment@internxt.com';
const PASSWORD = 'Str0ngE2EPassw0rd!';

/** Records the order in which the checkout endpoints are hit. */
const recordCheckoutCalls = (requests: string[]) => (request: Request) => {
  const url = new URL(request.url());

  if (CHECKOUT_ENDPOINTS.createCustomer(url)) requests.push('customer');
  else if (CHECKOUT_ENDPOINTS.invoices(url)) requests.push('invoices');
  else if (CHECKOUT_ENDPOINTS.createSubscription(url)) requests.push('subscription');
  else if (CHECKOUT_ENDPOINTS.createPaymentIntent(url)) requests.push('payment-intent');
};

test.describe('checkout - payment', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await blockThirdParty(page);
    await stubBrowserGlobals(page);
    await mockInlineSignUp(page, { email: EMAIL, password: PASSWORD });
  });

  test('TC1: monthly plan posts customer, invoices and subscription in order', async ({ page }) => {
    const plan = buildMonthlyPrice();
    await mockCheckoutAPIs(page, { price: plan });

    const calls: string[] = [];
    page.on('request', recordCheckoutCalls(calls));

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: plan.price.id });
    await checkout.waitForCheckoutReady();
    await checkout.fillCredentials(EMAIL, PASSWORD);
    await checkout.fillCardDetails();

    const subscriptionRequest = page.waitForRequest((request) =>
      CHECKOUT_ENDPOINTS.createSubscription(new URL(request.url())),
    );

    await checkout.clickPay();

    const payload = (await subscriptionRequest).postDataJSON();
    expect(payload).toMatchObject({
      customerId: buildCustomerResponse().customerId,
      priceId: plan.price.id,
      captchaToken: MOCK_CAPTCHA_TOKEN,
      currency: plan.price.currency,
    });
    expect(payload.promoCodeId).toBeUndefined();
    expect(calls).toEqual(['customer', 'invoices', 'subscription']);
  });

  test('TC2: yearly plan posts the subscription with the yearly price id', async ({ page }) => {
    const plan = buildYearlyPrice();
    await mockCheckoutAPIs(page, { price: plan });

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: plan.price.id });
    await checkout.waitForCheckoutReady();
    await checkout.fillCredentials(EMAIL, PASSWORD);
    await checkout.fillCardDetails();

    const subscriptionRequest = page.waitForRequest((request) =>
      CHECKOUT_ENDPOINTS.createSubscription(new URL(request.url())),
    );

    await checkout.clickPay();

    expect((await subscriptionRequest).postDataJSON()).toMatchObject({ priceId: plan.price.id });
  });

  test('TC3: lifetime plan uses the payment-intent endpoint and loads crypto currencies', async ({ page }) => {
    const plan = buildLifetimePrice();
    await mockCheckoutAPIs(page, { price: plan });

    const cryptoCurrenciesRequest = page.waitForRequest((request) =>
      CHECKOUT_ENDPOINTS.cryptoCurrencies(new URL(request.url())),
    );

    const calls: string[] = [];
    page.on('request', recordCheckoutCalls(calls));

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: plan.price.id });
    await checkout.waitForCheckoutReady();
    await cryptoCurrenciesRequest;

    await checkout.fillCredentials(EMAIL, PASSWORD);
    await checkout.fillCardDetails();

    const paymentIntentRequest = page.waitForRequest((request) =>
      CHECKOUT_ENDPOINTS.createPaymentIntent(new URL(request.url())),
    );

    await checkout.clickPay();

    expect((await paymentIntentRequest).postDataJSON()).toMatchObject({
      priceId: plan.price.id,
      captchaToken: MOCK_CAPTCHA_TOKEN,
    });
    expect(calls).not.toContain('subscription');
  });

  test('TC4: an already paid lifetime invoice lands on /checkout/success without a Stripe confirmation', async ({
    page,
  }) => {
    const plan = buildLifetimePrice();
    const coupon = buildCouponCodeData({ codeName: 'ALMOSTFREE', percentOff: 99 });

    await mockCheckoutAPIs(page, { price: plan, coupon, paymentIntent: buildPaidPaymentIntent() });

    let confirmationCalls = 0;
    await page.route('https://api.stripe.com/v1/payment_intents/**/confirm', (route) => {
      confirmationCalls += 1;
      return route.abort();
    });

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: plan.price.id, couponCode: coupon.codeName });
    await checkout.waitForCheckoutReady();
    await checkout.fillCredentials(EMAIL, PASSWORD);
    await checkout.fillCardDetails();
    await checkout.clickPay();

    await page.waitForURL('**/checkout/success**', { timeout: 60000 });
    expect(confirmationCalls).toEqual(0);
  });

  test('TC5: a 409 on customer creation opens the change plan dialog', async ({ page }) => {
    const plan = buildMonthlyPrice();
    await mockCheckoutAPIs(page, { price: plan });
    await page.route(CHECKOUT_ENDPOINTS.createCustomer, (route) =>
      jsonError(route, 409, 'User already has a subscription'),
    );

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: plan.price.id });
    await checkout.waitForCheckoutReady();
    await checkout.fillCredentials(EMAIL, PASSWORD);
    await checkout.fillCardDetails();
    await checkout.clickPay();

    await expect(checkout.changePlanDialog).toBeVisible();

    const upgradeRequest = page.waitForRequest(
      (request) => CHECKOUT_ENDPOINTS.updateSubscription(new URL(request.url())) && request.method() === 'PUT',
    );

    await checkout.changePlanConfirm.click();

    expect((await upgradeRequest).postDataJSON()).toMatchObject({ price_id: plan.price.id });
  });

  test('TC6: a failing subscription call shows an error toast and re-enables the pay button', async ({ page }) => {
    const plan = buildMonthlyPrice();
    await mockCheckoutAPIs(page, { price: plan });
    await page.route(CHECKOUT_ENDPOINTS.createSubscription, (route) =>
      jsonError(route, 500, 'Subscription could not be created'),
    );

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: plan.price.id });
    await checkout.waitForCheckoutReady();
    await checkout.fillCredentials(EMAIL, PASSWORD);
    await checkout.fillCardDetails();
    await checkout.clickPay();

    await checkout.expectToast(/something went wrong|error|could not/i);
    await expect(checkout.payButton).toBeEnabled();
  });

  test('TC7: a 100%-off coupon still renders a usable checkout', async ({ page }) => {
    test.fail();

    const plan = buildLifetimePrice();
    const coupon = buildCouponCodeData({ codeName: 'FREELIFE', percentOff: 100 });
    await mockCheckoutAPIs(page, { price: plan, coupon, paymentIntent: buildPaidPaymentIntent() });

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: plan.price.id, couponCode: coupon.codeName });
    await checkout.waitForCheckoutReady();
  });
});
