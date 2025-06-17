import { describe, expect, test } from 'vitest';
import { formatDateToCustomTimezoneString, sendConversionToAPI } from './googleSheet.service';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { UserType } from '@internxt/sdk/dist/drive/payments/types/types';

describe('Google Sheets Conversion Logger', () => {
  test('should send a test conversion to the sheet', async () => {
      const mockValue: PriceWithTax = {
      price: {
        id: 'price_001',
        currency: 'EUR',
        amount: 9999,
        bytes: 10737418240,
        interval: 'year',
        decimalAmount: 99.99,
        type: 'personal' as UserType,
        product: 'cloud-storage',
      },
      taxes: {
        tax: 0,
        decimalTax: 0,
        amountWithTax: 9999,
        decimalAmountWithTax: 99.99,
      },
    };

    const testConversion = {
      gclid: 'EAIaIQobChMI9wD6TnqjAMVDCZDbz1kqSsgEAAQYAyAAEgIDAPD_BwE',
      name: 'Compra test',
      value: mockValue,
      currency: 'EUR',
      timestamp: new Date(),
      users: 1,
      couponCodeData: undefined,
    };

    await expect(sendConversionToAPI(testConversion)).resolves.toBeUndefined();
  });
});

describe('formatDateToCustomTimezoneString', () => {
  test('should format a standard UTC date correctly', () => {
    const date = new Date(Date.UTC(2023, 0, 1, 10, 30, 45));
    const result = formatDateToCustomTimezoneString(date);
    expect(result).toBe('01-01-2023 11:30:45+0100');
  });

  test('should correctly pad single digit components', () => {
    const date = new Date(Date.UTC(2023, 8, 5, 7, 5, 3));
    const result = formatDateToCustomTimezoneString(date);
    expect(result).toBe('09-05-2023 08:05:03+0100');
  });

  test('should handle end of year date', () => {
    const date = new Date(Date.UTC(2023, 11, 31, 23, 59, 59));
    const result = formatDateToCustomTimezoneString(date);
    expect(result).toBe('01-01-2024 00:59:59+0100');

  });
});
