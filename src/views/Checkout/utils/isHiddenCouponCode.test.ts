import { describe, expect, it } from 'vitest';
import { isHiddenCouponCode } from './isHiddenCouponCode';

describe('Telling apart the coupons whose discount must not be advertised', () => {
  it.each(['SPECIAL', 'OFFER', 'AFFIOFFER'])('When the applied code is %s, then its discount is hidden', (codeName) => {
    expect(isHiddenCouponCode(codeName)).toBe(true);
  });

  it.each(['OFFER94', 'BLACKFRIDAY', 'special'])(
    'When the applied code is %s, then its discount is shown',
    (codeName) => {
      expect(isHiddenCouponCode(codeName)).toBe(false);
    },
  );

  it('When no code is applied, then there is no discount to hide', () => {
    expect(isHiddenCouponCode()).toBe(false);
  });
});
