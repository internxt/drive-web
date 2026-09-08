import { Page, Route } from '@playwright/test';
import { CouponCodeData, CreatedSubscriptionData } from '@internxt/sdk/dist/drive/payments/types/types';
import { CryptoCurrency, PriceWithTax } from '@internxt/sdk/dist/payments/types';
import CryptoJS from 'crypto-js';
import { MOCK_CAPTCHA_TOKEN } from './initScripts';

/**
 * Checkout talks to three different origins and there is no Vite proxy, so every route matcher has
 * to be built from the same env vars the app reads at runtime.
 */
export const PAYMENTS_API_URL = process.env.REACT_APP_PAYMENTS_API_URL ?? 'http://localhost:8003';
export const DRIVE_NEW_API_URL = process.env.REACT_APP_DRIVE_NEW_API_URL ?? 'http://localhost:3004/api';
export const LOCATION_API_URL = process.env.REACT_APP_LOCATION_API_URL ?? 'http://location_api_url';

const TOKEN_LIFETIME_SECONDS = 24 * 60 * 60;

/** Same base64url JWT generator used by `helper/getUser.ts`. */
function base64url(payload: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(payload))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function generateMockToken(claims: Record<string, unknown> = {}): string {
  const header = base64url({ alg: 'HS256', typ: 'JWT' });
  const now = Math.floor(Date.now() / 1000);
  const payload = base64url({ ...claims, iat: now, exp: now + TOKEN_LIFETIME_SECONDS });
  return `${header}.${payload}.mocksignature`;
}

/* -------------------------------------------------------------------------- */
/* Route matching                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Matches on origin + pathname only, so query strings (priceId, currency, promoCodeName, …) never
 * break a matcher. Playwright runs the most recently registered handler first, which is what lets
 * a spec override a single endpoint after `mockCheckoutAPIs` installed the defaults.
 */
const pathMatcher =
  (baseUrl: string, path: string) =>
  (url: URL): boolean =>
    `${url.origin}${url.pathname}` === `${baseUrl}${path}`;

export const paymentsPath = (path: string) => pathMatcher(PAYMENTS_API_URL, path);
export const drivePath = (path: string) => pathMatcher(DRIVE_NEW_API_URL, path);

export const CHECKOUT_ENDPOINTS = {
  userLocation: (url: URL) => `${url.origin}${url.pathname}`.replace(/\/$/, '') === LOCATION_API_URL.replace(/\/$/, ''),
  promoCodeByName: paymentsPath('/promo-code-by-name'),
  priceById: paymentsPath('/checkout/price-by-id'),
  cryptoCurrencies: paymentsPath('/checkout/crypto/currencies'),
  verifyCryptoPayment: paymentsPath('/checkout/crypto/verify/payment'),
  createCustomer: paymentsPath('/checkout/customer'),
  createSubscription: paymentsPath('/checkout/subscription'),
  createPaymentIntent: paymentsPath('/checkout/payment-intent'),
  invoices: paymentsPath('/invoices'),
  updateSubscription: paymentsPath('/subscriptions'),
  register: drivePath('/users'),
  refreshUser: drivePath('/users/refresh'),
  login: drivePath('/auth/login'),
  loginAccess: drivePath('/auth/login/access'),
};

/* -------------------------------------------------------------------------- */
/* Payload builders                                                           */
/* -------------------------------------------------------------------------- */

export interface UserLocationMock {
  ip: string;
  location: string;
}

export const buildUserLocation = (overrides: Partial<UserLocationMock> = {}): UserLocationMock => ({
  ip: '83.32.0.1',
  location: 'ES',
  ...overrides,
});

export interface PriceMockOptions {
  id?: string;
  interval?: 'month' | 'year' | 'lifetime';
  currency?: string;
  /** Net price in minor units (cents). */
  amount?: number;
  bytes?: number;
  product?: string;
  /** Tax applied on top of `amount`, expressed as a ratio (0.21 = 21%). Use 0 to hide the tax row. */
  taxRatio?: number;
}

const PRICE_DEFAULTS: Required<Omit<PriceMockOptions, 'id'>> & { id: string } = {
  id: 'price_monthly_mock',
  interval: 'month',
  currency: 'eur',
  amount: 999,
  bytes: 1099511627776,
  product: 'prod_mock',
  taxRatio: 0.21,
};

/**
 * Mirrors the `PriceWithTax` shape asserted in `src/views/Checkout/hooks/useInitializeCheckout.test.ts`.
 * `amount`/`taxes.*` are minor units (what Stripe elements consume), `decimal*` are display units.
 */
export const buildPriceWithTax = (options: PriceMockOptions = {}): PriceWithTax => {
  const { id, interval, currency, amount, bytes, product, taxRatio } = { ...PRICE_DEFAULTS, ...options };
  const tax = Math.round(amount * taxRatio);
  const amountWithTax = amount + tax;

  return {
    price: {
      id,
      bytes,
      product,
      currency,
      amount,
      decimalAmount: amount / 100,
      interval,
      type: 'individual' as PriceWithTax['price']['type'],
    },
    taxes: {
      tax,
      decimalTax: tax / 100,
      amountWithTax,
      decimalAmountWithTax: amountWithTax / 100,
    },
  };
};

export const buildMonthlyPrice = (options: PriceMockOptions = {}) =>
  buildPriceWithTax({ id: 'price_monthly_mock', interval: 'month', amount: 999, ...options });

export const buildYearlyPrice = (options: PriceMockOptions = {}) =>
  buildPriceWithTax({ id: 'price_yearly_mock', interval: 'year', amount: 10788, ...options });

export const buildLifetimePrice = (options: PriceMockOptions = {}) =>
  buildPriceWithTax({ id: 'price_lifetime_mock', interval: 'lifetime', amount: 29900, ...options });

export const buildCouponCodeData = (overrides: Partial<CouponCodeData> = {}): CouponCodeData => ({
  codeId: 'promo_mock_id',
  codeName: 'E2ETEST',
  percentOff: 50,
  ...overrides,
});

/**
 * Recomputes the totals the payments API would return once a promotion code is attached. The
 * undiscounted `price` block is intentionally left untouched: the product card renders it as the
 * struck-through "normal" price while the total comes from `taxes`.
 */
export const applyCouponToPrice = (price: PriceWithTax, coupon: CouponCodeData): PriceWithTax => {
  const netAmount = price.price.amount;
  const discounted = coupon.amountOff
    ? Math.max(0, netAmount - coupon.amountOff)
    : Math.round((netAmount * (100 - (coupon.percentOff ?? 0))) / 100);

  const taxRatio = netAmount > 0 ? price.taxes.tax / netAmount : 0;
  const tax = Math.round(discounted * taxRatio);
  const amountWithTax = discounted + tax;

  return {
    price: price.price,
    taxes: {
      tax,
      decimalTax: tax / 100,
      amountWithTax,
      decimalAmountWithTax: amountWithTax / 100,
    },
  };
};

export const buildCustomerResponse = (overrides: Partial<{ customerId: string; token: string }> = {}) => ({
  customerId: 'cus_mock_123',
  token: generateMockToken({ customerId: 'cus_mock_123' }),
  ...overrides,
});

export const buildSubscriptionResponse = (
  overrides: Partial<CreatedSubscriptionData> = {},
): CreatedSubscriptionData => ({
  type: 'payment',
  clientSecret: 'pi_mock_secret_123',
  subscriptionId: 'sub_mock_123',
  paymentIntentId: 'pi_mock_123',
  ...overrides,
});

export interface PaymentIntentFiatMock {
  id: string;
  type: 'fiat';
  clientSecret: string | null;
  invoiceStatus?: string;
}

export const buildPaymentIntentFiat = (overrides: Partial<PaymentIntentFiatMock> = {}): PaymentIntentFiatMock => ({
  id: 'pi_mock_lifetime',
  type: 'fiat',
  clientSecret: 'pi_mock_lifetime_secret',
  ...overrides,
});

/**
 * A one-time payment fully covered by a 100%-off coupon: Stripe marks the invoice paid and returns
 * no client secret, so `useUserPayment` navigates straight to /checkout/success without calling
 * `confirmPayment`. This is the only complete purchase journey that is fully mockable.
 */
export const buildPaidPaymentIntent = (): PaymentIntentFiatMock =>
  buildPaymentIntentFiat({ clientSecret: null, invoiceStatus: 'paid' });

export interface PaymentIntentCryptoMock {
  id: string;
  type: 'crypto';
  token: string;
  payload: {
    paymentRequestUri: string;
    payAmount: number;
    payCurrency: string;
    paymentAddress: string;
    url: string;
    qrUrl: string;
  };
}

export const buildPaymentIntentCrypto = (
  overrides: Partial<PaymentIntentCryptoMock> = {},
): PaymentIntentCryptoMock => ({
  id: 'pi_mock_crypto',
  type: 'crypto',
  token: 'crypto_invoice_token_mock',
  payload: {
    paymentRequestUri: 'bitcoin:bc1qmockaddress?amount=0.0042',
    payAmount: 0.0042,
    payCurrency: 'btc',
    paymentAddress: 'bc1qmockaddress',
    url: 'https://example.invalid/crypto-invoice',
    // Inline SVG data URI: keeps the QR <img> from making a network request.
    qrUrl:
      'data:image/svg+xml;base64,' +
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"></svg>').toString('base64'),
  },
  ...overrides,
});

export const buildCryptoCurrencies = (): CryptoCurrency[] => [
  {
    currencyId: 'btc',
    name: 'Bitcoin',
    type: 'crypto',
    receiveType: true,
    networks: [{ platformId: 'btc', name: 'Bitcoin' }],
    imageUrl:
      'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString('base64'),
  },
  {
    currencyId: 'eth',
    name: 'Ethereum',
    type: 'crypto',
    receiveType: true,
    networks: [{ platformId: 'eth', name: 'Ethereum' }],
    imageUrl:
      'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString('base64'),
  },
];

/** `checkIsFirstPurchase` only looks at the array length. */
export const buildInvoices = (count = 0) =>
  Array.from({ length: count }, (_, index) => ({
    id: `in_mock_${index}`,
    created: Date.now(),
    bytesInPlan: 1099511627776,
    pdf: 'https://example.invalid/invoice.pdf',
    total: 999,
    currency: 'eur',
  }));

/* -------------------------------------------------------------------------- */
/* Registrar                                                                  */
/* -------------------------------------------------------------------------- */

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

export const jsonError = (route: Route, status: number, message: string, extra: Record<string, unknown> = {}) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ message, statusCode: status, ...extra }),
  });

export interface CheckoutMockOptions {
  /** Undiscounted plan returned by `GET /checkout/price-by-id`. Defaults to a monthly plan. */
  price?: PriceWithTax;
  /** The single promotion code the mocked API knows about. Any other name resolves to a 404. */
  coupon?: CouponCodeData | null;
  location?: UserLocationMock | null;
  cryptoCurrencies?: CryptoCurrency[];
  invoices?: ReturnType<typeof buildInvoices>;
  customer?: ReturnType<typeof buildCustomerResponse>;
  subscription?: CreatedSubscriptionData;
  paymentIntent?: PaymentIntentFiatMock | PaymentIntentCryptoMock;
  /** Response of `POST /checkout/crypto/verify/payment`. */
  cryptoPaymentVerified?: boolean;
}

/**
 * Installs the full set of checkout API stubs. Individual endpoints can be re-routed per test by
 * calling `page.route(...)` afterwards — Playwright gives precedence to the newest handler.
 */
export const mockCheckoutAPIs = async (page: Page, options: CheckoutMockOptions = {}): Promise<void> => {
  const {
    price = buildMonthlyPrice(),
    coupon = null,
    location = buildUserLocation(),
    cryptoCurrencies = buildCryptoCurrencies(),
    invoices = buildInvoices(0),
    customer = buildCustomerResponse(),
    subscription = buildSubscriptionResponse(),
    paymentIntent = buildPaymentIntentFiat(),
    cryptoPaymentVerified = true,
  } = options;

  // Blocking call: when it never resolves the checkout loader spins forever.
  await page.route(CHECKOUT_ENDPOINTS.userLocation, (route) =>
    location ? json(route, location) : jsonError(route, 500, 'Location unavailable'),
  );

  await page.route(CHECKOUT_ENDPOINTS.promoCodeByName, (route) => {
    const requested = new URL(route.request().url()).searchParams.get('promotionCode');

    if (!coupon || requested !== coupon.codeName) {
      return jsonError(route, 404, 'Promotion code not found');
    }

    return json(route, coupon);
  });

  await page.route(CHECKOUT_ENDPOINTS.priceById, (route) => {
    const requestedCoupon = new URL(route.request().url()).searchParams.get('promoCodeName');
    const shouldDiscount = !!coupon && requestedCoupon === coupon.codeName;

    return json(route, shouldDiscount ? applyCouponToPrice(price, coupon) : price);
  });

  await page.route(CHECKOUT_ENDPOINTS.cryptoCurrencies, (route) => json(route, cryptoCurrencies));
  await page.route(CHECKOUT_ENDPOINTS.verifyCryptoPayment, (route) => json(route, cryptoPaymentVerified));
  await page.route(CHECKOUT_ENDPOINTS.invoices, (route) => json(route, invoices));
  await page.route(CHECKOUT_ENDPOINTS.createCustomer, (route) => json(route, customer));
  await page.route(CHECKOUT_ENDPOINTS.createSubscription, (route) => json(route, subscription));
  await page.route(CHECKOUT_ENDPOINTS.createPaymentIntent, (route) => json(route, paymentIntent));
};

/* -------------------------------------------------------------------------- */
/* Inline authentication                                                      */
/* -------------------------------------------------------------------------- */

export const MOCK_SIGNUP_USER_UUID = '3d3c2b1a-0000-4000-8000-000000000001';

/**
 * Registration response for the inline sign-up flow.
 *
 * The keys are intentionally empty strings: `parseAndDecryptUserKeys` short-circuits on falsy keys,
 * which keeps the flow moving without having to ship a real OpenPGP/Kyber key pair in the repo.
 * `mnemonic` must still be decryptable with the submitted password, so specs pass a pre-encrypted
 * value built by `encryptMnemonicWithPassword`.
 */
export const buildRegisterResponse = (options: { email: string; encryptedMnemonic: string; uuid?: string }) => {
  const uuid = options.uuid ?? MOCK_SIGNUP_USER_UUID;
  const user = {
    userId: 'mock-user-id',
    uuid,
    email: options.email,
    username: options.email,
    bridgeUser: options.email,
    name: 'E2E',
    lastname: 'Checkout',
    mnemonic: options.encryptedMnemonic,
    root_folder_id: 1,
    rootFolderId: '00000000-0000-4000-8000-000000000002',
    credit: 0,
    createdAt: new Date().toISOString(),
    privateKey: '',
    publicKey: '',
    revocationKey: '',
    keys: {
      ecc: { publicKey: '', privateKey: '' },
      kyber: { publicKey: '', privateKey: '' },
    },
    teams: false,
    appSumoDetails: null,
    registerCompleted: true,
    hasReferralsProgram: false,
    backupsBucket: null,
    sharedWorkspace: false,
    avatar: null,
    emailVerified: true,
  };

  return {
    user,
    token: generateMockToken({ email: options.email }),
    newToken: generateMockToken({ uuid, email: options.email, name: user.name, lastname: user.lastname }),
    uuid,
  };
};

/**
 * Mirrors `encryptTextWithKey` from `src/app/crypto/services/utils.ts`. The sign-up flow decrypts
 * the mnemonic the API returns with the password the user typed, so the fixture has to be produced
 * with the exact same CryptoJS pipeline or registration blows up before checkout resumes.
 */
export const encryptMnemonicWithPassword = (mnemonic: string, password: string): string => {
  const encrypted = CryptoJS.AES.encrypt(mnemonic, password).toString();
  return CryptoJS.enc.Base64.parse(encrypted).toString(CryptoJS.enc.Hex);
};

export const MOCK_MNEMONIC =
  'legal winner thank year wave sausage worth useful legal winner thank year wave sausage worth useful legal will';

export interface InlineSignUpMockOptions {
  email: string;
  password: string;
  uuid?: string;
}

/**
 * Serves the whole drive origin from fixtures, so a signed-in session survives.
 *
 * Registration is only the first call: `initializeUserThunk` immediately fans out to
 * `/users/limit`, `/users/usage` and `/users/avatar/refresh`, and every SDK client is built with an
 * `unauthorizedCallback` that dispatches `logoutThunk()`. Leaving those unrouted lets them reach
 * whatever is actually listening on the drive port — a real drive-server answers 401 to a fixture
 * token, the session is torn down, and the signed-in block renders with an empty email while the
 * following payment call goes out with no `Authorization` header. Answering every drive request
 * keeps the suites hermetic; anything unknown gets an empty 200 because only a non-2xx is harmful.
 */
export const mockDriveApi = async (page: Page, registration: ReturnType<typeof buildRegisterResponse>) => {
  const fixtures: Array<{ matches: (url: URL) => boolean; body: unknown; status?: number }> = [
    { matches: CHECKOUT_ENDPOINTS.register, body: registration, status: 201 },
    { matches: CHECKOUT_ENDPOINTS.refreshUser, body: { user: registration.user } },
    { matches: drivePath('/users/limit'), body: { maxSpaceBytes: 1073741824 } },
    { matches: drivePath('/users/usage'), body: { drive: 0, backups: 0, total: 0 } },
    { matches: drivePath('/users/avatar/refresh'), body: { avatar: null } },
  ];

  await page.route(`${DRIVE_NEW_API_URL}/**`, (route) => {
    const url = new URL(route.request().url());
    const fixture = fixtures.find((candidate) => candidate.matches(url));

    return json(route, fixture?.body ?? {}, fixture?.status ?? 200);
  });
};

/**
 * Mocks the inline sign-up path: registration plus everything the session needs to stay alive
 * afterwards (see `mockDriveApi`).
 */
export const mockInlineSignUp = async (page: Page, options: InlineSignUpMockOptions): Promise<void> => {
  const response = buildRegisterResponse({
    email: options.email,
    uuid: options.uuid,
    encryptedMnemonic: encryptMnemonicWithPassword(MOCK_MNEMONIC, options.password),
  });

  await mockDriveApi(page, response);
};

/**
 * Fails registration with the given status so the auth-error branch of `useAuthCheckout` renders.
 */
export const mockSignUpFailure = async (page: Page, status: number, message: string): Promise<void> => {
  await page.route(CHECKOUT_ENDPOINTS.register, (route) => jsonError(route, status, message));
};

/**
 * Fails the sign-in path. `POST /auth/login` doubles as the security-details endpoint used by the
 * 2FA probe, so `tfaEnabled` controls whether checkout reports "invalid credentials" or the
 * dedicated two-factor message.
 */
export const mockSignInFailure = async (
  page: Page,
  options: { status: number; message: string; tfaEnabled?: boolean },
): Promise<void> => {
  await page.route(CHECKOUT_ENDPOINTS.login, (route) =>
    json(route, {
      hasKeys: true,
      sKey: 'mock-encrypted-salt',
      tfa: options.tfaEnabled ?? false,
      hasKyberKeys: true,
      hasEccKeys: true,
    }),
  );

  await page.route(CHECKOUT_ENDPOINTS.loginAccess, (route) => jsonError(route, options.status, options.message));
};

export { MOCK_CAPTCHA_TOKEN };
