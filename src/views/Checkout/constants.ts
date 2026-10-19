export const GCLID_COOKIE_LIFESPAN_DAYS = 90;
export const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export const POSTAL_CODE_REQUIRED_COUNTRIES = ['US', 'CA', 'IN'];

/**
 * Smallest amount, in minor units, that Stripe accepts for the `amount` option of an Elements
 * instance (0.50 EUR / 0.50 USD). Amounts below it are rejected, so they must never be sent.
 * See https://docs.stripe.com/currencies#minimum-and-maximum-charge-amounts
 */
export const STRIPE_MINIMUM_CHARGE_AMOUNT = 50;

export const THEME_STYLES = {
  dark: {
    stripeTheme: 'night',
    backgroundColor: '#111111',
    textColor: '#FFFFFF',
    borderColor: '#3A3A3B',
    borderInputColor: '#8E8E94',
    labelTextColor: '#E5E5EB',
    placeholderTextColor: '#8E8E94',
  },
  light: {
    stripeTheme: 'flat',
    backgroundColor: '#FFFFFF',
    textColor: '#111111',
    borderColor: '#E5E5EB',
    borderInputColor: '#AEAEB3',
    labelTextColor: '#3A3A3B',
    placeholderTextColor: '#AEAEB3',
  },
} as const;

export const STATUS_CODE_ERROR = {
  USER_EXISTS: 409,
  COUPON_NOT_VALID: 422,
  PROMO_CODE_BY_NAME_NOT_FOUND: 404,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
};
