import { describe, it, test, expect } from 'vitest';
import { formatPrice } from './formatPrice';

describe('Formatting the price to have 2 decimals', () => {
  it('When the price does not have decimals, the function returns it without .00', () => {
    expect(formatPrice(10)).toBe('10');
  });

  describe('The value has less or exactly 2 decimals', () => {
    test('When the user has a price with 1 decimal, the function returns 2 decimals (100.5 -> 100.50)', () => {
      expect(formatPrice(100.5)).toBe('100.50');
    });

    test('When the user has a price with 2 decimals, the function returns 2 decimals (99.99 -> 99.99)', () => {
      expect(formatPrice(99.99)).toBe('99.99');
    });
  });

  it('When the price is just 1 decimal and it is a 0, then the function returns without .00', () => {
    expect(formatPrice(20.0)).toBe('20');
  });

  test('When the price has more than 2 decimals, then the function returns the price truncated to 2 decimals (10.456 -> 10.45 - 10.001 -> 10 - 1.999 -> 1.99)', () => {
    expect(formatPrice(10.456)).toBe('10.45');
    expect(formatPrice(10.001)).toBe('10');
    expect(formatPrice(1.999)).toBe('1.99');
  });

  test('When the value is nearly integer due to float error, then it returns without decimals', () => {
    expect(formatPrice(10.0000001)).toBe('10');
  });

  test('When there is a floating point precision error (19.99 * 100 = 1998.999... in JS), then it truncates to 2 decimals (19.99 -> 19.98)', () => {
    expect(formatPrice(19.99)).toBe('19.98');
  });
});
