import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  expect: {
    timeout: 4000,
  },
  timeout: 70000,

  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'https://drive.internxt.com/login',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      testDir: './tests/specs',
    },
    {
      name: 'Internxt E2E tests on chromium',
      testDir: './tests/specs',
      use: { ...devices['Desktop Chrome'], storageState: './tests/specs/playwright/.auth/user.json' },
      dependencies: ['setup'],
    },

    {
      name: 'Internxt E2E tests on firefox',
      testDir: './tests/specs',
      use: { ...devices['Desktop Firefox'], storageState: './tests/specs/playwright/.auth/user.json' },
      dependencies: ['setup'],
    },

    {
      name: 'Internxt E2E tests on webkit',
      testDir: './tests/specs',
      use: { ...devices['Desktop Safari'], storageState: './tests/specs/playwright/.auth/user.json' },
      dependencies: ['setup'],
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    {
      name: 'Internxt E2E tests on Edge',
      testDir: './tests/specs',
      use: { ...devices['Desktop Edge'], channel: 'msedge', storageState: './tests/specs/playwright/.auth/user.json' },
      dependencies: ['setup'],
    },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
