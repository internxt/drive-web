import { describe, expect, test } from 'vitest';
import { sendConversionToAPI } from './googleSheet.service';
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
