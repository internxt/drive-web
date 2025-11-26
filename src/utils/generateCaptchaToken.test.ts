import { describe, it, expect, beforeEach, vi } from 'vitest';
import envService from '../services/env.service';

vi.mock('../services/env.service');

describe('generateCaptchaToken', () => {
  const mockRecaptchaSiteKey = 'test-recaptcha-site-key';
  const mockCaptchaToken = 'mock-captcha-token-123';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(envService.getVariable).mockReturnValue(mockRecaptchaSiteKey);

    globalThis.grecaptcha = {
      ready: vi.fn((callback) => callback()),
      execute: vi.fn().mockResolvedValue(mockCaptchaToken),
    } as never;
  });

  it('should wait for grecaptcha ready, execute with correct params, and return token', async () => {
    const { generateCaptchaToken } = await import('./generateCaptchaToken');
    const token = await generateCaptchaToken();

    expect(globalThis.grecaptcha.ready).toHaveBeenCalledWith(expect.any(Function));
    expect(envService.getVariable).toHaveBeenCalledWith('recaptchaV3');
    expect(globalThis.grecaptcha.execute).toHaveBeenCalledWith(mockRecaptchaSiteKey, {
      action: 'authentication',
    });
    expect(token).toBe(mockCaptchaToken);
  });

  it('should return different tokens from different executions', async () => {
    vi.mocked(globalThis.grecaptcha.execute).mockResolvedValueOnce('token-1').mockResolvedValueOnce('token-2');

    const { generateCaptchaToken } = await import('./generateCaptchaToken');
    const token1 = await generateCaptchaToken();
    const token2 = await generateCaptchaToken();

    expect(token1).toBe('token-1');
    expect(token2).toBe('token-2');
    expect(token1).not.toBe(token2);
  });
});
