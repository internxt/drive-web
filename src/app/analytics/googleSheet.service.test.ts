import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { sendConversionToAPI } from './googleSheet.service';
import envService from 'services/env.service';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';

const mockWebsiteUrl = 'https://mocked-api.internxt.com';
const mockedRecaptchaV3 = 'mocked-recaptcha-key';

describe('Google Sheets Conversion Logger', () => {
  const mockGrecaptchaReady = vi.fn((cb) => cb());
  const mockGrecaptchaExecute = vi.fn().mockResolvedValue('mocked-token');
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

  const originalGrecaptcha = globalThis.window.grecaptcha;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    globalThis.window.grecaptcha = {
      ready: mockGrecaptchaReady,
      execute: mockGrecaptchaExecute,
    };
    vi.spyOn(envService, 'getVariable').mockImplementation((key) => {
      if (key === 'websiteUrl') return mockWebsiteUrl;
      if (key === 'recaptchaV3') return mockedRecaptchaV3;
      else return 'no mock implementation';
    });
  });

  afterAll(() => {
    globalThis.window.grecaptcha = originalGrecaptcha;
    globalThis.fetch = originalFetch;
    errorSpy.mockRestore();
  });

  it('When the correct data is provided, then should send event correctly', async () => {
    const inputDate = new Date(Date.UTC(2024, 0, 1, 10, 0, 0));
    const expectedTimestamp = '01-01-2024 12:00:00+0100';
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: 'ok' }),
    } as unknown as Response);

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
      `${mockWebsiteUrl}/api/collect/sheet`,
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

  it('When the response is not ok, then an error indicating so is printed', async () => {
    const inputDate = new Date(2024, 0, 1, 11, 0, 0);

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Bad request' }),
    } as unknown as Response);

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
    expect(errorSpy).toHaveBeenCalledWith('There was an error sending the event:', { error: 'Bad request' });
  });

  it('When an unexpected error happens, then an error indicating so is printed', async () => {
    const inputDate = new Date(2024, 0, 1, 11, 0, 0);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.spyOn(globalThis.window.grecaptcha, 'execute').mockRejectedValue(new Error('No client token detected'));

    await sendConversionToAPI({
      gclid: 'test-gclid',
      name: 'test-name',
      value: { price: { decimalAmount: 5 } } as unknown as PriceWithTax,
      users: 1,
      currency: 'USD',
      timestamp: inputDate,
    });

    expect(errorSpy).toHaveBeenCalledWith(
      'Something went wrong while sending an event to sheet API: ',
      expect.any(Error),
    );
  });
});
