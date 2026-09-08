import { expect, test } from '@playwright/test';
import { blockThirdParty } from '../../helper/blockThirdParty';
import {
  CHECKOUT_ENDPOINTS,
  MOCK_CAPTCHA_TOKEN,
  buildMonthlyPrice,
  jsonError,
  mockCheckoutAPIs,
  mockInlineSignUp,
  mockSignInFailure,
  mockSignUpFailure,
} from '../../helper/checkoutMocks';
import { stubBrowserGlobals } from '../../helper/initScripts';
import { CheckoutPage } from '../../pages/checkoutPage';

const EMAIL = 'e2e-checkout-auth@internxt.com';
const PASSWORD = 'Str0ngE2EPassw0rd!';
const PLAN = buildMonthlyPrice();

/**
 * Reaching the authentication step requires a valid card: `onCheckoutButtonClicked` runs
 * `elements.submit()` and `createConfirmationToken` before it ever touches the auth API.
 */
const submitCheckout = async (checkout: CheckoutPage) => {
  await checkout.fillCredentials(EMAIL, PASSWORD);
  await checkout.fillCardDetails();
  await checkout.clickPay();
};

test.describe('checkout - authentication', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test.beforeEach(async ({ page }) => {
    await blockThirdParty(page);
    await stubBrowserGlobals(page);
    await mockCheckoutAPIs(page, { price: PLAN });
  });

  test('TC1: defaults to sign up and switches to sign in through the toggle', async ({ page }) => {
    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: PLAN.price.id });
    await checkout.waitForCheckoutReady();

    await expect(page.getByText('Create password')).toBeVisible();

    await checkout.toggleAuthMethod();

    await expect(page.getByText('Your password')).toBeVisible();
    await expect(checkout.emailInput).toBeVisible();
  });

  test('TC2: inline sign up registers the user and then creates the Stripe customer', async ({ page }) => {
    await mockInlineSignUp(page, { email: EMAIL, password: PASSWORD });

    const registerRequest = page.waitForRequest(
      (request) => CHECKOUT_ENDPOINTS.register(new URL(request.url())) && request.method() === 'POST',
    );
    const customerRequest = page.waitForRequest((request) => CHECKOUT_ENDPOINTS.createCustomer(new URL(request.url())));

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: PLAN.price.id });
    await checkout.waitForCheckoutReady();
    await submitCheckout(checkout);

    const registerPayload = (await registerRequest).postDataJSON();
    expect(registerPayload).toMatchObject({ email: EMAIL, captcha: MOCK_CAPTCHA_TOKEN });

    const customerPayload = (await customerRequest).postDataJSON();
    expect(customerPayload).toMatchObject({ captchaToken: MOCK_CAPTCHA_TOKEN, country: 'ES' });
  });

  test('TC3: a 409 on sign up reports that the email is already registered', async ({ page }) => {
    await mockSignUpFailure(page, 409, 'Email already in use');

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: PLAN.price.id });
    await checkout.waitForCheckoutReady();
    await submitCheckout(checkout);

    await expect(checkout.authError).toContainText('There is already an account with this email address');
  });

  test('TC4: a 401 on sign in reports invalid credentials', async ({ page }) => {
    await mockSignInFailure(page, { status: 401, message: 'Wrong login credentials' });

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: PLAN.price.id });
    await checkout.waitForCheckoutReady();
    await checkout.toggleAuthMethod();
    await submitCheckout(checkout);

    await expect(checkout.authError).toContainText('The email or password is incorrect');
  });

  test('TC5: a 401 on a two-factor account asks the user to log in from the login page', async ({ page }) => {
    // `is2FANeeded` reuses `POST /auth/login` as the security-details endpoint.
    await mockSignInFailure(page, { status: 401, message: 'Wrong login credentials', tfaEnabled: true });

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: PLAN.price.id });
    await checkout.waitForCheckoutReady();
    await checkout.toggleAuthMethod();
    await submitCheckout(checkout);

    await expect(checkout.authError).toContainText('two-factor authentication');
  });

  test('TC6: a 403 on sign in reports a locked account', async ({ page }) => {
    await mockSignInFailure(page, { status: 403, message: 'Account locked' });

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: PLAN.price.id });
    await checkout.waitForCheckoutReady();
    await checkout.toggleAuthMethod();
    await submitCheckout(checkout);

    await expect(checkout.authError).toContainText('locked for security reasons');
  });

  test('TC7: a 429 on sign in reports too many attempts', async ({ page }) => {
    await mockSignInFailure(page, { status: 429, message: 'Too many requests' });

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: PLAN.price.id });
    await checkout.waitForCheckoutReady();
    await checkout.toggleAuthMethod();
    await submitCheckout(checkout);

    await expect(checkout.authError).toContainText('Too many attempts');
  });

  /**
   * Reaching the signed-in state without shipping a real key fixture: the inline sign-up leaves the
   * user authenticated even when the payment that follows fails, which is exactly the state this
   * test needs.
   */
  test('TC8: a signed-in user sees their account and can log back out to the sign up form', async ({ page }) => {
    await mockInlineSignUp(page, { email: EMAIL, password: PASSWORD });
    await page.route(CHECKOUT_ENDPOINTS.createSubscription, (route) => jsonError(route, 500, 'Nope'));

    const checkout = new CheckoutPage(page);
    await checkout.gotoCheckout({ planId: PLAN.price.id });
    await checkout.waitForCheckoutReady();
    await submitCheckout(checkout);

    await expect(checkout.signedInBlock).toBeVisible();
    await expect(checkout.signedInEmail).toHaveText(EMAIL);
    await expect(checkout.authToggle).toHaveCount(0);

    await checkout.logOut();

    await expect(checkout.emailInput).toBeVisible();
    await expect(page.getByText('Create password')).toBeVisible();
  });
});
