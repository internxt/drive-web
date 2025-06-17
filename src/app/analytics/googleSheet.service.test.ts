import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendConversionToAPI } from './googleSheet.service';
import { envConfig } from 'app/core/services/env.service';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';

vi.mock('app/core/services/env.service', () => ({
  envConfig: {
    app: {
      websiteUrl: 'https://mocked-api.internxt.com',
    },
    services: {
      recaptchaV3: 'mocked-recaptcha-key',
    },
  },
}));

describe('Google Sheets Conversion Logger', () => {
  const mockGrecaptchaReady = vi.fn((cb) => cb());
  const mockGrecaptchaExecute = vi.fn().mockResolvedValue('mocked-token');

  const originalGrecaptcha = globalThis.window.grecaptcha;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.window.grecaptcha = {
      ready: mockGrecaptchaReady,
      execute: mockGrecaptchaExecute,
    };
  });

  afterAll(() => {
    globalThis.window.grecaptcha = originalGrecaptcha;
  });

  it('When the correct data is provided, then should send event correctly', async () => {
    const inputDate = new Date(2024, 0, 1, 11, 0, 0);
    const expectedTimestamp = '01-01-2024 13:00:00+0200';
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'ok' }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    await sendConversionToAPI({
      gclid: 'test-gclid',
      name: 'test-name',
      value: { price: { decimalAmount: 5 } } as unknown as PriceWithTax,
      users: 1,
      currency: 'USD',
      timestamp: inputDate,
    });

    expect(mockGrecaptchaExecute).toHaveBeenCalledWith('mocked-recaptcha-key', {
      action: 'conversion',
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      `${envConfig.app.websiteUrl}/api/collect/sheet`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          gclid: 'test-gclid',
          name: 'test-name',
          value: '5',
          currency: 'USD',
          timestamp: expectedTimestamp,
          captcha: 'mocked-token',
        }),
      }),
    );
  });
});
