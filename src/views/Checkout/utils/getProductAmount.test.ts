import { describe, it, expect } from 'vitest';
import { getProductAmount } from './getProductAmount';
import { CouponCodeData } from '../types';

describe('Calculating final price of a product', () => {
  it('When there is no coupon, returns base amount multiplied by users', () => {
    expect(getProductAmount(10, 2)).toBe('20');
  });

  describe('When amountOff coupon is applied', () => {
    it('When there is a fixed discount (amountOff), it subtracts that discount per user', () => {
      const coupon: CouponCodeData = {
        amountOff: 100, // 1.00€
        percentOff: undefined,
        codeId: '1',
        codeName: 'DISCOUNT',
      };

      expect(getProductAmount(10, 2, coupon)).toBe('18');
    });
  });

  describe('When percentOff coupon is applied', () => {
    it('When there is a percentage discount, it reduces the price accordingly', () => {
      const coupon: CouponCodeData = {
        percentOff: 50, // 0.50€
        amountOff: undefined,
        codeId: '2',
        codeName: 'HALFOFF',
      };

      expect(getProductAmount(10, 3, coupon)).toBe('15');
    });

    it('Supports non-integer results rounded to 2 decimals', () => {
      const coupon: CouponCodeData = {
        percentOff: 33,
        amountOff: undefined,
        codeId: '3',
        codeName: '33OFF',
      };

      expect(getProductAmount(9.99, 1, coupon)).toBe('6.69');
    });
  });

  it('Handles case with 0 users gracefully (should return 0)', () => {
    expect(getProductAmount(10, 0)).toBe('0');
  });

  describe('When discount results in negative price', () => {
    it('Returns 0 if amountOff discount exceeds the product price', () => {
      const coupon: CouponCodeData = {
        amountOff: 2000,
        percentOff: undefined,
        codeId: '4',
        codeName: 'BIGDISCOUNT',
      };

      expect(getProductAmount(10, 1, coupon)).toBe('0');
    });

    it('Returns 0 if percentOff is 100% or more', () => {
      const coupon: CouponCodeData = {
        percentOff: 100,
        amountOff: undefined,
        codeId: '5',
        codeName: 'FREE',
      };

      expect(getProductAmount(10, 2, coupon)).toBe('0');
    });
  });
});
