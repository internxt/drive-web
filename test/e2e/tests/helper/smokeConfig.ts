import { faker } from '@faker-js/faker';
import { test } from '@playwright/test';

/**
 * Shared configuration for the smoke suite.
 *
 * The variables are read from the environment (`playwright.config.ts` loads `.env`), never
 * hardcoded: the price IDs and the JWT secret belong to whichever payments instance the run points
 * at. `.env.example` documents them.
 */
export const SMOKE_ENV = {
  /** `JWT_SECRET` of the payments instance under test — the minted user token is signed with it. */
  jwtSecret: process.env.SMOKE_PAYMENTS_JWT_SECRET ?? '',
  /** A recurring price ID that exists in the Stripe **test** account payments is wired to. */
  monthlyPriceId: process.env.SMOKE_MONTHLY_PRICE_ID ?? '',
  /**
   * A lifetime (one-time) price ID in the same account.
   *
   * Optional, and gated separately: `POST /checkout/payment-intent` calls `fetchUserStorage`, so
   * unlike the subscription path it additionally needs payments' drive gateway to be reachable and
   * its keypair to match the drive server's.
   */
  lifetimePriceId: process.env.SMOKE_LIFETIME_PRICE_ID ?? '',
  /** Optional: a promotion code that exists in the same account. */
  testCoupon: process.env.SMOKE_TEST_COUPON,
  /**
   * Optional: a user that already exists in the drive database.
   *
   * The subscription path never needs one — payments only reads the uuid and email out of the JWT.
   * The lifetime path does: it asks the drive gateway whether that user can take on the extra
   * storage, and the gateway answers 404 for a uuid it has never seen. A disposable uuid therefore
   * cannot exercise lifetime; point these at a throwaway drive account instead.
   */
  driveUser: {
    uuid: process.env.SMOKE_DRIVE_USER_UUID ?? '',
    email: process.env.SMOKE_DRIVE_USER_EMAIL ?? '',
  },
  password: 'Str0ngE2ESmokeP4ss!',
};

/** Stripe redirects, 3-D Secure challenges and PayPal simulators all sit inside this budget. */
export const SUCCESS_TIMEOUT = 120000;

/**
 * Prefixed so the accounts and Stripe customers a run leaves behind are identifiable. The drive
 * sign-up is stubbed, so nothing is created on the drive side; the Stripe test-mode customer is
 * real and disposable.
 */
export const disposableEmail = (): string => `e2e+checkout.${Date.now()}.${faker.string.alphanumeric(6)}@internxt.com`;

/**
 * Skips the suite unless it has everything it needs to talk to a real payments instance. Skipping
 * rather than failing keeps a nightly run's signal meaningful when the secrets are absent.
 */
export const skipUnlessSmokeConfigured = (): void => {
  test.skip(
    !SMOKE_ENV.jwtSecret || !SMOKE_ENV.monthlyPriceId,
    'Set SMOKE_PAYMENTS_JWT_SECRET and SMOKE_MONTHLY_PRICE_ID to run the smoke suite.',
  );
};
