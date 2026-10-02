import { Page } from '@playwright/test';

export const MOCK_CAPTCHA_TOKEN = 'mock-captcha-token';

/**
 * reCAPTCHA v3 has no test bypass, and checkout calls `generateCaptchaToken()` twice before it can
 * reach the payments API. Replacing `window.grecaptcha` before any app script runs keeps the flow
 * deterministic and lets specs assert on the token that ends up in the request payloads.
 */
export const stubGrecaptcha = async (page: Page): Promise<void> => {
  await page.addInitScript((token: string) => {
    (globalThis as any).grecaptcha = {
      ready: (callback: () => void) => callback(),
      execute: async () => token,
      render: () => 'mock-widget-id',
      reset: () => undefined,
    };
  }, MOCK_CAPTCHA_TOKEN);
};

/**
 * `authenticateUser` calls `globalThis.gtag(...)` unguarded after a successful inline sign-in
 * (see src/services/auth.service.ts). Without the real GTM script the call throws and aborts the
 * checkout submission, so the stub is mandatory for every sign-in spec.
 */
export const stubGtag = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    (globalThis as any).dataLayer = (globalThis as any).dataLayer ?? [];
    (globalThis as any).gtag = (...args: unknown[]) => {
      (globalThis as any).dataLayer.push(args);
    };
  });
};

/**
 * Installs every init script the checkout specs rely on. Must run before `page.goto`.
 */
export const stubBrowserGlobals = async (page: Page): Promise<void> => {
  await stubGrecaptcha(page);
  await stubGtag(page);
};
