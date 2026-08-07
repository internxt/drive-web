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
  readonly loader: Locator;
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

    // `CheckoutLoader` is the only full-height centered block rendered while checkout boots.
    this.loader = page.locator('div.flex.h-full.items-center.justify-center.bg-gray-1');
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

  /** Waits for the checkout form to replace the loader. */
  async waitForCheckoutReady(): Promise<void> {
    await expect(this.payButton).toBeVisible();
    await expect(this.totalAmount).toBeVisible();
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

  /** Resolves once the card fields inside the PaymentElement are mounted and interactive. */
  async waitForStripeReady(): Promise<void> {
    const frame = await this.findStripeFrameWith('[name="number"]');
    await expect(frame.locator('[name="number"]')).toBeVisible();
  }

  /**
   * Fills the real Stripe card fields with a test card. Kept as a single implementation so iframe
   * flake only ever has to be fixed in one place.
   */
  async fillCardDetails(details: CardDetails = {}): Promise<void> {
    const card = { ...TEST_CARD, ...details };
    const frame = await this.findStripeFrameWith('[name="number"]');

    await frame.locator('[name="number"]').fill(card.number);
    await frame.locator('[name="expiry"]').fill(card.expiry);
    await frame.locator('[name="cvc"]').fill(card.cvc);

    const postalCode = frame.locator('[name="postalCode"]');
    if ((await postalCode.count()) > 0) {
      await postalCode.fill('28001');
    }
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
