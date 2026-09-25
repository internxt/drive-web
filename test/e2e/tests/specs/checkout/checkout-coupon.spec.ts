import { expect, test } from '@playwright/test';
import { blockThirdParty } from '../../helper/blockThirdParty';
import {
  CHECKOUT_ENDPOINTS,
  buildCouponCodeData,
  buildMonthlyPrice,
  jsonError,
  mockCheckoutAPIs,
  mockInlineSignUp,
} from '../../helper/checkoutMocks';
import { stubBrowserGlobals } from '../../helper/initScripts';
import { CheckoutPage } from '../../pages/checkoutPage';

const EMAIL = 'e2e-checkout-coupon@internxt.com';
const PASSWORD = 'Str0ngE2EPassw0rd!';

// 9.99 € + 21% tax = 12.09 €. A 50% coupon leaves 4.99 € net and 6.05 € total.
const PLAN = buildMonthlyPrice({ amount: 999, taxRatio: 0.21 });
const COUPON = buildCouponCodeData({ codeName: 'E2ETEST', percentOff: 50 });

const UNDISCOUNTED_TOTAL = '€12.09';
const DISCOUNTED_TOTAL = '€6.05';

test.describe('checkout - coupon', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await blockThirdParty(page);
    await stubBrowserGlobals(page);
    await mockInlineSignUp(page, { email: EMAIL, password: PASSWORD });
  });

  test('TC1: applying a percent-off coupon updates the totals and shows the discount row', async ({ page }) => {
    await mockCheckoutAPIs(page, { price: PLAN, coupon: COUPON });

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: PLAN.price.id });
    await checkout.waitForCheckoutReady();
    await expect(checkout.totalAmount).toHaveText(UNDISCOUNTED_TOTAL);

    await checkout.applyCoupon(COUPON.codeName);

    await expect(checkout.totalAmount).toHaveText(DISCOUNTED_TOTAL);
    await expect(checkout.billedAmount).toHaveText('€4.99');
    await expect(checkout.discountRow).toBeVisible();
    await expect(checkout.discountLabel).toContainText('50');
    await expect(checkout.normalPrice).toHaveText('€9.99');
    await expect(checkout.appliedCouponName).toHaveText(COUPON.codeName);
  });

  test('TC2: removing an applied coupon restores the original totals', async ({ page }) => {
    await mockCheckoutAPIs(page, { price: PLAN, coupon: COUPON });

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: PLAN.price.id, couponCode: COUPON.codeName });
    await checkout.waitForCheckoutReady();
    await expect(checkout.totalAmount).toHaveText(DISCOUNTED_TOTAL);

    await checkout.removeCoupon();

    await expect(checkout.totalAmount).toHaveText(UNDISCOUNTED_TOTAL);
    await expect(checkout.discountRow).toBeHidden();
    await expect(checkout.openCouponButton).toBeVisible();
  });

  test('TC3: an unknown coupon shows an inline error and leaves the totals untouched', async ({ page }) => {
    await mockCheckoutAPIs(page, { price: PLAN, coupon: COUPON });

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: PLAN.price.id });
    await checkout.waitForCheckoutReady();

    await checkout.applyCoupon('NOPE');

    await expect(checkout.couponError).toBeVisible();
    await expect(checkout.totalAmount).toHaveText(UNDISCOUNTED_TOTAL);
  });

  test('TC4: a coupon passed in the URL is applied on load', async ({ page }) => {
    await mockCheckoutAPIs(page, { price: PLAN, coupon: COUPON });

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: PLAN.price.id, couponCode: COUPON.codeName });
    await checkout.waitForCheckoutReady();

    await expect(checkout.appliedCouponName).toHaveText(COUPON.codeName);
    await expect(checkout.totalAmount).toHaveText(DISCOUNTED_TOTAL);
  });

  test('TC5: a hidden coupon discounts the total while keeping the coupon UI out of sight', async ({ page }) => {
    const hiddenCoupon = buildCouponCodeData({ codeName: 'SPECIAL', percentOff: 50 });
    await mockCheckoutAPIs(page, { price: PLAN, coupon: hiddenCoupon });

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: PLAN.price.id, couponCode: hiddenCoupon.codeName });
    await checkout.waitForCheckoutReady();

    await expect(checkout.totalAmount).toHaveText(DISCOUNTED_TOTAL);
    await expect(checkout.discountRow).toBeHidden();
    await expect(checkout.appliedCoupon).toBeHidden();
    await expect(checkout.openCouponButton).toBeHidden();
  });

  /**
   * Regression guard for the production bug this suite exists for: a coupon was reflected in the UI
   * totals but never reached the payments API, so the charge (and the wallet sheet) used the
   * undiscounted amount.
   */
  test('TC6: an applied coupon reaches the subscription payload as promoCodeId', async ({ page }) => {
    await mockCheckoutAPIs(page, { price: PLAN, coupon: COUPON });

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: PLAN.price.id });
    await checkout.waitForCheckoutReady();

    await checkout.applyCoupon(COUPON.codeName);
    await expect(checkout.totalAmount).toHaveText(DISCOUNTED_TOTAL);

    await checkout.fillCredentials(EMAIL, PASSWORD);
    await checkout.fillCardDetails();

    const subscriptionRequest = page.waitForRequest((request) =>
      CHECKOUT_ENDPOINTS.createSubscription(new URL(request.url())),
    );

    await checkout.clickPay();

    expect((await subscriptionRequest).postDataJSON()).toMatchObject({
      priceId: PLAN.price.id,
      promoCodeId: COUPON.codeId,
    });
  });

  test('TC7: a 422 at payment time shows the coupon error toast and re-enables the pay button', async ({ page }) => {
    await mockCheckoutAPIs(page, { price: PLAN, coupon: COUPON });
    await page.route(CHECKOUT_ENDPOINTS.createSubscription, (route) =>
      jsonError(route, 422, 'Coupon is not valid for this user'),
    );

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: PLAN.price.id, couponCode: COUPON.codeName });
    await checkout.waitForCheckoutReady();
    await checkout.fillCredentials(EMAIL, PASSWORD);
    await checkout.fillCardDetails();
    await checkout.clickPay();

    await checkout.expectToast('Coupon can only be redeemed by new customers');
    await expect(checkout.payButton).toBeEnabled();
  });
});
