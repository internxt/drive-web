import { HIDDEN_COUPON_CODES } from '../constants';

/**
 * Tells whether an applied promotional code belongs to the campaigns whose discount must not be
 * advertised in the checkout.
 */
export const isHiddenCouponCode = (codeName?: string): boolean => HIDDEN_COUPON_CODES.includes(codeName ?? '');
