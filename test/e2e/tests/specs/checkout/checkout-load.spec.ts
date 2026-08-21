import { expect, test } from '@playwright/test';
import { blockThirdParty } from '../../helper/blockThirdParty';
import {
  CHECKOUT_ENDPOINTS,
  buildLifetimePrice,
  buildMonthlyPrice,
  buildUserLocation,
  mockCheckoutAPIs,
} from '../../helper/checkoutMocks';
import { stubBrowserGlobals } from '../../helper/initScripts';
import { CheckoutPage } from '../../pages/checkoutPage';

const MONTHLY_PLAN = buildMonthlyPrice({ amount: 999, taxRatio: 0.21 });

test.describe('checkout - initial load', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await blockThirdParty(page);
    await stubBrowserGlobals(page);
  });

  test('TC1: renders billed amount, taxes, total and the Stripe payment element', async ({ page }) => {
    await mockCheckoutAPIs(page, { price: MONTHLY_PLAN });

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: MONTHLY_PLAN.price.id });
    await checkout.waitForCheckoutReady();

    await expect(checkout.billedAmount).toHaveText('€9.99');
    await expect(checkout.taxAmount).toHaveText('€2.10');
    await expect(checkout.totalAmount).toHaveText('€12.09');
    await expect(checkout.paymentElement).toBeVisible();
  });

  test('TC2: hides the tax row when the plan carries no tax', async ({ page }) => {
    const taxFreePlan = buildMonthlyPrice({ amount: 999, taxRatio: 0 });
    await mockCheckoutAPIs(page, { price: taxFreePlan });

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: taxFreePlan.price.id });
    await checkout.waitForCheckoutReady();

    await expect(checkout.taxRow).toBeHidden();
    await expect(checkout.totalAmount).toHaveText('€9.99');
  });

  test('TC3: forwards the currency query param to the price endpoint', async ({ page }) => {
    await mockCheckoutAPIs(page, { price: buildMonthlyPrice({ currency: 'usd' }) });

    const priceRequest = page.waitForRequest((request) => CHECKOUT_ENDPOINTS.priceById(new URL(request.url())));

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: MONTHLY_PLAN.price.id, currency: 'usd' });

    const url = new URL((await priceRequest).url());
    expect(url.searchParams.get('currency')).toEqual('usd');
    expect(url.searchParams.get('priceId')).toEqual(MONTHLY_PLAN.price.id);

    await checkout.waitForCheckoutReady();
    await expect(checkout.totalAmount).toContainText('$');
  });

  test('TC4: refetches the price with country and postal code when the billing address changes', async ({ page }) => {
    // The postal code only reaches `useBillingDetails` through the AddressElement of the crypto
    // section, which is mounted for lifetime plans only.
    const lifetimePlan = buildLifetimePrice();
    await mockCheckoutAPIs(page, { price: lifetimePlan, location: buildUserLocation({ location: 'ES' }) });

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: lifetimePlan.price.id });
    await checkout.waitForCheckoutReady();

    await checkout.selectCryptoCurrency('btc', 'Bitcoin');

    const addressRefetch = page.waitForRequest((request) => {
      const url = new URL(request.url());
      return CHECKOUT_ENDPOINTS.priceById(url) && url.searchParams.get('postalCode') === '28001';
    });

    await checkout.fillBillingAddress({ country: 'ES', line1: 'Gran Via 1', city: 'Madrid', postalCode: '28001' });

    const url = new URL((await addressRefetch).url());
    expect(url.searchParams.get('country')).toEqual('ES');
    expect(url.searchParams.get('postalCode')).toEqual('28001');
  });
});
