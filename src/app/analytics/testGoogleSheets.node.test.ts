import { describe, expect, test } from 'vitest';
import { sendConversionToSheet } from './googleSheet.service';

describe('Google Sheets Conversion Logger', () => {
  test('should send a test conversion to the sheet', async () => {
    const testConversion = {
      gclid: 'EAIaIQobChMI9wD6TnqjAMVDCZDbz1kqSsgEAAQYAyAAEgIDAPD_BwE',
      name: 'Compra test',
      value: 99.99,
      currency: 'EUR',
    };

    await expect(sendConversionToSheet(testConversion)).resolves.toBeUndefined();
  });
});
