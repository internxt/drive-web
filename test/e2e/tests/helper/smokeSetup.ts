import { Page, Route } from '@playwright/test';
import { createHmac, randomUUID } from 'crypto';
import {
  CHECKOUT_ENDPOINTS,
  MOCK_MNEMONIC,
  UserLocationMock,
  buildRegisterResponse,
  buildUserLocation,
  encryptMnemonicWithPassword,
  mockDriveApi,
} from './checkoutMocks';

/**
 * Setup for the smoke suite, which runs against a **real payments service** (the local
 * `local-environment` stack on :8003) and **real Stripe test mode**.
 *
 * Only two things are stubbed here, and neither is part of the integration under test:
 *
 *  - the drive API sign-up, so the suite does not need a running drive-server plus its network
 *    service, and so it never leaves real accounts behind;
 *  - the location API, which is a blocking call at boot and is a plain geo-IP lookup.
 *
 * Everything downstream — customer creation, subscription/payment-intent creation, the Stripe
 * confirmation and the redirect to `/checkout/success` — is the real thing.
 */

const base64url = (input: Buffer | string): string =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const TOKEN_LIFETIME_SECONDS = 60 * 60;

/**
 * Mints the token the payments service will accept.
 *
 * `setupAuth` registers `@fastify/jwt` with `config.JWT_SECRET` and every checkout route reads
 * `req.user.payload`, so the token has to be a genuine HS256 signature over a `{ payload: … }`
 * envelope — the unsigned placeholder `generateMockToken` produces is enough for the mocked suite
 * but is rejected here with a 401.
 */
export const signPaymentsToken = (
  claims: { uuid: string; email: string },
  secret: string,
  lifetimeSeconds = TOKEN_LIFETIME_SECONDS,
): string => {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const issuedAt = Math.floor(Date.now() / 1000);
  const body = base64url(
    JSON.stringify({
      payload: { ...claims, name: 'E2E', lastname: 'Smoke' },
      iat: issuedAt,
      exp: issuedAt + lifetimeSeconds,
    }),
  );
  const signature = base64url(createHmac('sha256', secret).update(`${header}.${body}`).digest());

  return `${header}.${body}.${signature}`;
};

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

/**
 * The location endpoint is a blocking dependency: `CheckoutViewWrapper` derives `billingCountry`
 * from it and refuses to submit without one, so it is stubbed rather than left to a real geo-IP
 * provider that would make the billing country (and therefore the tax) vary per run.
 */
export const mockUserLocation = async (page: Page, location: UserLocationMock = buildUserLocation()): Promise<void> => {
  await page.route(CHECKOUT_ENDPOINTS.userLocation, (route) => json(route, location));
};

export interface SmokeUser {
  email: string;
  password: string;
  uuid: string;
  token: string;
}

export interface SmokeSignUpOptions {
  email: string;
  password: string;
  /** Payments' `JWT_SECRET`; the minted token is verified against it on every checkout call. */
  jwtSecret: string;
  uuid?: string;
}

/**
 * Stubs the inline sign-up so the browser ends up holding a token the real payments service trusts.
 *
 * The uuid is fresh per test: payments keys its Mongo user record on it, so a new one guarantees the
 * "first purchase" branch and avoids colliding with customers left by earlier runs.
 */
export const mockSmokeSignUp = async (page: Page, options: SmokeSignUpOptions): Promise<SmokeUser> => {
  const uuid = options.uuid ?? randomUUID();
  const token = signPaymentsToken({ uuid, email: options.email }, options.jwtSecret);

  const response = {
    ...buildRegisterResponse({
      email: options.email,
      uuid,
      encryptedMnemonic: encryptMnemonicWithPassword(MOCK_MNEMONIC, options.password),
    }),
    token,
    newToken: token,
  };

  await mockDriveApi(page, response);

  return { email: options.email, password: options.password, uuid, token };
};
