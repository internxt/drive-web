import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { sendConversionToAPI } from './googleSheet.service';
import { formatDateToCustomTimezoneString } from './googleSheet.service';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { UserType } from '@internxt/sdk/dist/drive/payments/types/types';

describe('formatDateToCustomTimezoneString', () => {
  test('should format date in UTC+1 with correct structure and offset', () => {
    const inputDate = new Date('2025-06-17T12:00:00Z');
    const formatted = formatDateToCustomTimezoneString(inputDate);
    expect(formatted).toBe('06-17-2025 13:00:00+0100');
  });
});

describe('sendConversionToAPI', () => {
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

  beforeEach(() => {
    Object.defineProperty(window, 'grecaptcha', {
      value: {
        ready: (cb: () => void) => cb(),
        execute: vi.fn().mockResolvedValue('mock-token'),
      },
      configurable: true,
    });

    Object.defineProperty(window, 'fetch', {
      value: vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      }),
      configurable: true,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test('should send timestamp in correct UTC+1 format', async () => {
    const testDate = new Date('2025-06-17T12:00:00Z');

    await sendConversionToAPI({
      gclid: 'test-gclid',
      name: 'Test Name',
      value: mockValue,
      currency: 'EUR',
      timestamp: testDate,
      users: 1,
      couponCodeData: undefined,
    });

    const fetchMock = window.fetch as unknown as { mock: { calls: any[][] } };
    expect(fetchMock.mock.calls.length).toBeGreaterThan(0);

    const [url, options] = fetchMock.mock.calls[0];
    const requestBody = JSON.parse(options.body);

    expect(url).toContain('/api/collect/sheet');
    expect(options.method).toBe('POST');
    expect(requestBody.timestamp).toBe('06-17-2025 13:00:00+0100');
    expect(requestBody.captcha).toBe('mock-token');
  });
});
