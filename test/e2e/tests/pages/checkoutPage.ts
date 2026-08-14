import { Frame, Locator, Page, expect } from '@playwright/test';

export interface GotoCheckoutParams {
  planId: string;
  couponCode?: string;
  currency?: string;
  mobileToken?: string;
}

export interface CardDetails {
  number?: string;
  expiry?: string;
  cvc?: string;
}

const TEST_CARD: Required<CardDetails> = {
  number: '4242424242424242',
  expiry: '12 / 34',
  cvc: '123',
};

/**
 * Stripe inserts its own grouping characters as you type, so `4242424242424242` comes back as
 * `4242 4242 4242 4242` and `1234` as `12 / 34`. Matching on the significant characters only keeps
 * the assertion independent of that formatting.
 */
const withAnySeparators = (value: string): RegExp =>
  new RegExp(`^\\W*${value.replace(/\W/g, '').split('').join('\\W*')}\\W*$`);

/**
 * How long to let the PaymentElement settle before re-checking that a change stuck. The price
 * refetch behind a remount is debounced, so the window has to outlast that debounce.
 */
const SETTLE_MS = 1500;

/**
 * Page object for `/checkout`. Mirrors the style of `pages/loginPage.ts`: locators are resolved in
 * the constructor, actions are small async methods that assert their own preconditions.
 */
export class CheckoutPage {
  readonly page: Page;

  // Product card
  readonly billedRow: Locator;
  readonly billedAmount: Locator;
  readonly taxRow: Locator;
  readonly taxAmount: Locator;
  readonly totalRow: Locator;
  readonly totalAmount: Locator;
  readonly discountRow: Locator;
  readonly discountLabel: Locator;
  readonly normalPrice: Locator;
  readonly payButton: Locator;

  // Coupon
  readonly openCouponButton: Locator;
  readonly couponInput: Locator;
  readonly applyCouponButton: Locator;
  readonly couponError: Locator;
  readonly appliedCoupon: Locator;
  readonly appliedCouponName: Locator;
  readonly removeCouponButton: Locator;

  // Auth
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly authToggle: Locator;
  readonly authError: Locator;
  readonly signedInBlock: Locator;
  readonly signedInEmail: Locator;
  readonly logOutButton: Locator;

  // Payment / crypto
  readonly paymentElement: Locator;
  readonly cryptoSection: Locator;
  readonly cryptoDropdown: Locator;
  readonly cryptoDialog: Locator;
  readonly cryptoDialogQr: Locator;
  readonly cryptoDialogCountdown: Locator;
  readonly cryptoDialogAddress: Locator;
  readonly cryptoDialogConfirm: Locator;

  // Dialogs
  readonly changePlanDialog: Locator;
  readonly changePlanConfirm: Locator;

  constructor(page: Page) {
    this.page = page;

    this.billedRow = page.locator('[data-cy="checkout-billed-row"]');
    this.billedAmount = page.locator('[data-cy="checkout-billed-amount"]');
    this.taxRow = page.locator('[data-cy="checkout-tax-row"]');
    this.taxAmount = page.locator('[data-cy="checkout-tax-amount"]');
    this.totalRow = page.locator('[data-cy="checkout-total-row"]');
    this.totalAmount = page.locator('[data-cy="checkout-total-amount"]');
    this.discountRow = page.locator('[data-cy="checkout-discount-row"]');
    this.discountLabel = page.locator('[data-cy="checkout-discount-label"]');
    this.normalPrice = page.locator('[data-cy="checkout-normal-price"]');
    this.payButton = page.locator('[data-cy="checkout-pay-button"]');

    this.openCouponButton = page.locator('[data-cy="checkout-open-coupon"]');
    this.couponInput = page.locator('[data-cy="coupon-code-input"]');
    this.applyCouponButton = page.locator('[data-cy="checkout-apply-coupon"]');
    this.couponError = page.locator('[data-cy="checkout-coupon-error"]');
    this.appliedCoupon = page.locator('[data-cy="checkout-applied-coupon"]');
    this.appliedCouponName = page.locator('[data-cy="checkout-applied-coupon-name"]');
    this.removeCouponButton = page.locator('[data-cy="checkout-remove-coupon"]');

    this.emailInput = page.locator('[data-cy="checkout-email-input"]');
    this.passwordInput = page.locator('[data-cy="checkout-password-input"]');
    this.authToggle = page.locator('[data-cy="checkout-auth-toggle"]');
    this.authError = page.locator('#authError');
    this.signedInBlock = page.locator('[data-cy="checkout-signed-in-user"]');
    this.signedInEmail = page.locator('[data-cy="checkout-signed-in-email"]');
    this.logOutButton = page.locator('[data-cy="checkout-logout-button"]');

    this.paymentElement = page.locator('iframe[name^="__privateStripeFrame"]').first();
    this.cryptoSection = page.locator('[data-cy="crypto-payment-section"]');
    this.cryptoDropdown = page.locator('[data-cy="crypto-currency-dropdown"]');
    this.cryptoDialog = page.locator('[data-cy="crypto-dialog-root"]');
    this.cryptoDialogQr = page.locator('[data-cy="crypto-dialog-qr"]');
    this.cryptoDialogCountdown = page.locator('[data-cy="crypto-dialog-countdown"]');
    this.cryptoDialogAddress = page.locator('[data-cy="crypto-dialog-address"]');
    this.cryptoDialogConfirm = page.locator('[data-cy="crypto-dialog-confirm"]');

    this.changePlanDialog = page.locator('[data-cy="checkout-change-plan-dialog"]');
    this.changePlanConfirm = page.locator('[data-cy="checkout-change-plan-confirm"]');
  }

  /* ---------------------------------------------------------------------- */
  /* Navigation                                                             */
  /* ---------------------------------------------------------------------- */

  async gotoCheckout({ planId, couponCode, currency, mobileToken }: GotoCheckoutParams): Promise<void> {
    const params = new URLSearchParams({ planId });

    if (couponCode) params.set('couponCode', couponCode);
    if (currency) params.set('currency', currency);
    if (mobileToken) params.set('mobileToken', mobileToken);

    await this.page.goto(`/checkout?${params.toString()}`);
  }

  /**
   * Waits for the checkout form to replace the loader.
   *
   * Given its own timeout rather than the global 15s expect budget: booting checkout means a
   * location lookup, a price lookup and Stripe.js, and against a real payments service under
   * parallel load that chain has been seen to outrun 15s.
   */
  async waitForCheckoutReady(timeout = 45000): Promise<void> {
    await expect(this.payButton).toBeVisible({ timeout });
    await expect(this.totalAmount).toBeVisible({ timeout });
  }

  /* ---------------------------------------------------------------------- */
  /* Product card                                                           */
  /* ---------------------------------------------------------------------- */

  async getTotal(): Promise<string> {
    return (await this.totalAmount.innerText()).trim();
  }

  async getBilledAmount(): Promise<string> {
    return (await this.billedAmount.innerText()).trim();
  }

  async getTax(): Promise<string> {
    return (await this.taxAmount.innerText()).trim();
  }

  /* ---------------------------------------------------------------------- */
  /* Coupon                                                                 */
  /* ---------------------------------------------------------------------- */

  async openCouponInput(): Promise<void> {
    await expect(this.openCouponButton).toBeVisible();
    await this.openCouponButton.click();
    await expect(this.couponInput).toBeVisible();
  }

  async applyCoupon(code: string): Promise<void> {
    await this.openCouponInput();
    await this.couponInput.fill(code);
    await expect(this.applyCouponButton).toBeEnabled();
    await this.applyCouponButton.click();
  }

  async removeCoupon(): Promise<void> {
    await expect(this.removeCouponButton).toBeVisible();
    await this.removeCouponButton.click();
  }

  /* ---------------------------------------------------------------------- */
  /* Authentication                                                         */
  /* ---------------------------------------------------------------------- */

  async fillCredentials(email: string, password: string): Promise<void> {
    await expect(this.emailInput).toBeVisible();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  async toggleAuthMethod(): Promise<void> {
    await expect(this.authToggle).toBeVisible();
    await this.authToggle.click();
  }

  async logOut(): Promise<void> {
    await expect(this.logOutButton).toBeVisible();
    await this.logOutButton.click();
  }

  async getAuthError(): Promise<string> {
    await expect(this.authError).toBeVisible();
    return (await this.authError.innerText()).trim();
  }

  /* ---------------------------------------------------------------------- */
  /* Stripe iframes                                                         */
  /* ---------------------------------------------------------------------- */

  /**
   * The PaymentElement and the AddressElement each mount their own cross-origin Stripe frame, and
   * the frame names are generated at runtime, so fields are located by scanning every mounted
   * `__privateStripeFrame*` for the field in question.
   */
  private async findStripeFrameWith(selector: string, timeout = 20000): Promise<Frame> {
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      for (const frame of this.page.frames()) {
        if (!frame.name().startsWith('__privateStripeFrame')) continue;

        const found = await frame
          .locator(selector)
          .count()
          .catch(() => 0);

        if (found > 0) return frame;
      }

      await this.page.waitForTimeout(200);
    }

    throw new Error(`No Stripe frame containing "${selector}" was found within ${timeout}ms`);
  }

  /**
   * Resolves the accordion header for a payment method inside the PaymentElement.
   *
   * The headers are `div[role="button"]`, not real `<button>` elements, so they are only reachable
   * by role. Which methods appear is decided by the Stripe account's settings and by
   * `payment_method_types` in `checkout.service.ts`.
   */
  private async findPaymentMethodOption(method: string, timeout = 20000): Promise<Locator> {
    const deadline = Date.now() + timeout;

    while (Date.now() < deadline) {
      for (const frame of this.page.frames()) {
        if (!frame.name().startsWith('__privateStripeFrame')) continue;

        const option = frame.getByRole('button', { name: method, exact: true });
        const found = await option.count().catch(() => 0);

        if (found > 0) return option.first();
      }

      await this.page.waitForTimeout(200);
    }

    throw new Error(`No Stripe payment-method option named "${method}" was found within ${timeout}ms`);
  }

  /** Asserts a payment method is offered, without selecting it. */
  async expectPaymentMethodAvailable(method: string): Promise<void> {
    const option = await this.findPaymentMethodOption(method);
    await expect(option).toBeVisible();
  }

  /**
   * Expands a payment method's accordion item.
   *
   * Retried for the same reason `selectCryptoCurrency` is: every non-collapsed PaymentElement
   * `onChange` runs `onStripePaymentExpanded`, which refetches the price and can remount the
   * element out from under the click.
   */
  async selectPaymentMethod(method: string): Promise<void> {
    await this.waitForStripeReady();

    await expect(async () => {
      const option = await this.findPaymentMethodOption(method, 5000);
      await option.click({ timeout: 3000 });
      await expect(option).toHaveAttribute('aria-expanded', 'true', { timeout: 3000 });

      // Expanding an item is itself an `onChange`, so the price refetch it triggers can remount the
      // element and collapse the selection again. Re-check after the dust settles.
      await this.page.waitForTimeout(SETTLE_MS);
      const settled = await this.findPaymentMethodOption(method, 5000);
      await expect(settled).toHaveAttribute('aria-expanded', 'true', { timeout: 3000 });
    }).toPass({ timeout: 60000, intervals: [500, 1000, 2000] });
  }

  /** Resolves once the card fields inside the PaymentElement are mounted and interactive. */
  async waitForStripeReady(): Promise<void> {
    const frame = await this.findStripeFrameWith('[name="number"]');
    await expect(frame.locator('[name="number"]')).toBeVisible();
    await expect(frame.locator('[name="number"]')).toBeEditable();
  }

  /**
   * Types a value into a Stripe field and only returns once the value has actually stuck.
   *
   * Stripe's fields are controlled inputs: an input event that lands before the element has finished
   * hydrating is accepted by the DOM node and then dropped on Stripe's next render, leaving the field
   * empty with no error. That window is widest for the first field touched, which is why a run under
   * load could end up at "Your card number is incomplete" with the expiry and CVC typed milliseconds
   * later still filled in. Re-resolving the frame on each attempt also covers a PaymentElement that
   * remounts mid-fill.
   */
  private async fillStripeField(selector: string, value: string): Promise<void> {
    await expect(async () => {
      const frame = await this.findStripeFrameWith(selector, 5000);
      const field = frame.locator(selector);

      await field.fill('');
      // Stripe re-formats as it goes, so only the significant characters are typed and its own
      // separators are left to it.
      await field.pressSequentially(value.replace(/\W/g, ''), { delay: 20 });

      await expect(field).toHaveValue(withAnySeparators(value), { timeout: 2000 });
    }).toPass({ timeout: 30000, intervals: [250, 500, 1000] });
  }

  /**
   * Fills the real Stripe card fields with a test card. Kept as a single implementation so iframe
   * flake only ever has to be fixed in one place.
   *
   * The fill is verified again after a settle window rather than just field by field. Every
   * non-collapsed PaymentElement `onChange` runs `onStripePaymentExpanded`, which refetches the
   * price and remounts the element; a remount that lands after the last field is typed silently
   * empties the form, and the failure only shows up much later as a payment that never leaves the
   * checkout page. Re-reading the values here turns that race into a retry.
   */
  async fillCardDetails(details: CardDetails = {}): Promise<void> {
    const card = { ...TEST_CARD, ...details };

    await expect(async () => {
      await this.fillStripeField('[name="number"]', card.number);
      await this.fillStripeField('[name="expiry"]', card.expiry);
      await this.fillStripeField('[name="cvc"]', card.cvc);

      const frame = await this.findStripeFrameWith('[name="number"]');
      if ((await frame.locator('[name="postalCode"]').count()) > 0) {
        await this.fillStripeField('[name="postalCode"]', '28001');
      }

      await this.page.waitForTimeout(SETTLE_MS);

      const settled = await this.findStripeFrameWith('[name="number"]', 5000);
      await expect(settled.locator('[name="number"]')).toHaveValue(withAnySeparators(card.number), { timeout: 3000 });
      await expect(settled.locator('[name="expiry"]')).toHaveValue(withAnySeparators(card.expiry), { timeout: 3000 });
      await expect(settled.locator('[name="cvc"]')).toHaveValue(withAnySeparators(card.cvc), { timeout: 3000 });
    }).toPass({ timeout: 90000, intervals: [500, 1000, 2000] });
  }

  /**
   * Fills the AddressElement mounted by the crypto section (lifetime plans only). It renders in its
   * own Stripe frame, separate from the PaymentElement one.
   */
  async fillBillingAddress(
    address: { country?: string; postalCode?: string; line1?: string; city?: string; name?: string } = {},
  ): Promise<void> {
    // Anchored on `addressLine1` rather than the country select: the card form inside the
    // PaymentElement also renders a `select[name="country"]`, so that one is ambiguous.
    const frame = await this.findStripeFrameWith('[name="addressLine1"]');

    // The section configures `display: { name: 'split' }`, so the name arrives as two fields.
    if (address.name) {
      const [first, ...rest] = address.name.split(' ');
      await frame.locator('[name="firstName"]').fill(first);
      await frame.locator('[name="lastName"]').fill(rest.join(' ') || 'Tester');
    }

    if (address.country) await frame.locator('select[name="country"]').selectOption(address.country);
    if (address.line1) await frame.locator('[name="addressLine1"]').fill(address.line1);
    if (address.city) await frame.locator('[name="locality"]').fill(address.city);
    if (address.postalCode) await frame.locator('[name="postalCode"]').fill(address.postalCode);
  }

  /* ---------------------------------------------------------------------- */
  /* Payment                                                                */
  /* ---------------------------------------------------------------------- */

  async clickPay(): Promise<void> {
    await expect(this.payButton).toBeEnabled();
    await this.payButton.click();
  }

  /* ---------------------------------------------------------------------- */
  /* Crypto                                                                 */
  /* ---------------------------------------------------------------------- */

  /**
   * Picks a coin from the crypto dropdown.
   *
   * `CheckoutView.onStripePaymentExpanded` resets the selected currency and closes this dropdown on
   * every non-collapsed PaymentElement `onChange`, and Stripe keeps emitting those while the element
   * settles. Waiting for the card fields first and then retrying the open+select pair makes the
   * interaction deterministic instead of racing those events.
   */
  async selectCryptoCurrency(currencyId: string, coinName: string): Promise<void> {
    await this.waitForStripeReady();
    await expect(this.cryptoDropdown).toBeVisible();

    await expect(async () => {
      await this.cryptoDropdown.click();
      await this.page.locator(`[data-cy="crypto-currency-option-${currencyId}"]`).click({ timeout: 3000 });
      await expect(this.cryptoSection).toContainText(coinName, { timeout: 3000 });
    }).toPass({ timeout: 45000 });
  }

  /* ---------------------------------------------------------------------- */
  /* Toasts                                                                 */
  /* ---------------------------------------------------------------------- */

  toastByText(text: string | RegExp): Locator {
    return this.page.getByText(text);
  }

  async expectToast(text: string | RegExp): Promise<void> {
    await expect(this.toastByText(text).first()).toBeVisible();
  }
}
