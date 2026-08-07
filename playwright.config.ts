import { defineConfig, devices } from '@playwright/test';
/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
import 'dotenv/config';

const CHECKOUT_MOCKED_SPECS = /[\\/]checkout[\\/].*\.spec\.ts$/;
const CHECKOUT_SMOKE_SPECS = /[\\/]checkout-smoke[\\/].*\.smoke\.spec\.ts$/;
const CHECKOUT_SPECS = /[\\/]checkout(-smoke)?[\\/]/;

const LEGACY_STORAGE_STATE = './test/e2e/tests/specs/playwright/auth/user.json';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  expect: {
    // Stripe renders its card fields in cross-origin iframes, which regularly need more than the
    // previous 4s to become interactive.
    timeout: 15000,
  },
  timeout: 70000,

  testDir: './test/e2e/tests/specs',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. Locally the checkout specs each drive real Stripe iframes, so
     the worker count is capped to keep browsers from being starved of resources. */
  workers: process.env.CI ? 1 : 4,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  outputDir: 'test-results',

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      testDir: './test/e2e/tests/specs',
    },
    {
      name: 'Internxt E2E tests on chromium',
      testDir: './test/e2e/tests/specs',
      testIgnore: CHECKOUT_SPECS,
      use: { ...devices['Desktop Chrome'], storageState: LEGACY_STORAGE_STATE },
      dependencies: ['setup'],
    },

    {
      name: 'Internxt E2E tests on firefox',
      testDir: './test/e2e/tests/specs',
      testIgnore: CHECKOUT_SPECS,
      use: { ...devices['Desktop Firefox'], storageState: LEGACY_STORAGE_STATE },
      dependencies: ['setup'],
    },

    /* Test against branded browsers. */
    {
      name: 'Internxt E2E tests on Edge',
      testDir: './test/e2e/tests/specs',
      testIgnore: CHECKOUT_SPECS,
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
        storageState: LEGACY_STORAGE_STATE,
      },
      dependencies: ['setup'],
    },

    /* Checkout: fully mocked APIs, deterministic, runs on every PR. */
    {
      name: 'checkout-mocked-chromium',
      testDir: './test/e2e/tests/specs',
      testMatch: CHECKOUT_MOCKED_SPECS,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'checkout-mocked-firefox',
      testDir: './test/e2e/tests/specs',
      testMatch: CHECKOUT_MOCKED_SPECS,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'checkout-mocked-edge',
      testDir: './test/e2e/tests/specs',
      testMatch: CHECKOUT_MOCKED_SPECS,
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },

    /* Checkout: a real payments service + Stripe test mode. Slow by design, so it gets its own
       budget. Single worker on purpose: every purchasing test spends one of the five
       `POST /checkout/customer` requests payments allows per hour per IP, and running them
       concurrently only adds contention to a suite that is bounded by network round trips anyway. */
    {
      name: 'checkout-smoke',
      testDir: './test/e2e/tests/specs',
      testMatch: CHECKOUT_SMOKE_SPECS,
      timeout: 180000,
      retries: 1,
      workers: 1,
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'yarn dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180000,
  },
});
