import { describe, it, expect } from 'vitest';
import { formatPrice } from './formatPrice';

describe('Formatting the price to have 2 decimals', () => {
  it('When the price does not have decimals, the function returns it with .00', () => {
    expect(formatPrice(10)).toBe('10.00');
  });

  describe('The value has less or exactly 2 decimals', () => {
    it('When the user has a price with 1 decimal, the function returns 2 decimals (100.5 -> 100.50)', () => {
      expect(formatPrice(100.5)).toBe('100.50');
    });

    it('When the user has a price with 2 decimals, the function returns 2 decimals (99.99 -> 99.99)', () => {
      expect(formatPrice(99.99)).toBe('99.99');
    });
  });

  it('When the price is just 1 decimal and it is a 0, then the function returns with .00', () => {
    expect(formatPrice(20.0)).toBe('20.00');
  });

  describe('The price has more than 2 decimals', () => {
    it('When the price has more than 2 decimals, then the function returns the price with 2 decimals (truncated with high precision, 10.456 -> 10.45 - 10.001 -> 10.00 - 1.999 -> 1.99)', () => {
      expect(formatPrice(10.456)).toBe('10.45');
      expect(formatPrice(10.001)).toBe('10.00');
      expect(formatPrice(1.999)).toBe('1.99');
    });
  });

  it('Handles edge case where value is nearly integer due to float error', () => {
    expect(formatPrice(10.0000001)).toBe('10.00');
  });
});
