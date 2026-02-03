import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retryWithBackoff } from './retry-with-rate-limit';
import * as timeUtils from 'utils/timeUtils';

vi.mock('utils/timeUtils', () => ({
  wait: vi.fn(() => Promise.resolve()),
}));

const createRateLimitError = (status: number, headers?: Record<string, string>, message?: string) => ({
  status,
  headers,
  ...(message && { message }),
});

const createRateLimitMock = (resetDelay: string, additionalHeaders?: Record<string, string>) =>
  vi
    .fn()
    .mockRejectedValueOnce(createRateLimitError(429, { 'x-ratelimit-reset': resetDelay, ...additionalHeaders }))
    .mockResolvedValueOnce('success');

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('when function succeeds immediately then returns result without retry', async () => {
    const mockFn = vi.fn().mockResolvedValue('success');

    const result = await retryWithBackoff(mockFn);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(timeUtils.wait).not.toHaveBeenCalled();
  });

  it('when rate limited then retries with delay from headers', async () => {
    const mockFn = createRateLimitMock('5000');

    const result = await retryWithBackoff(mockFn);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(timeUtils.wait).toHaveBeenCalledWith(5000);
  });

  it('when different error formats received then recognizes all as rate limits', async () => {
    const testCases = [
      { statusCode: 429, headers: { 'x-ratelimit-reset': '1000' } },
      { response: { status: 429 }, headers: { 'x-ratelimit-reset': '1000' } },
      { message: 'Too Many Requests', headers: { 'x-ratelimit-reset': '1000' } },
    ];

    for (const errorFormat of testCases) {
      const mockFn = vi.fn().mockRejectedValueOnce(errorFormat).mockResolvedValueOnce('success');
      await retryWithBackoff(mockFn);
      expect(mockFn).toHaveBeenCalledTimes(2);
      vi.clearAllMocks();
    }
  });

  it('when error is not rate limit then throws immediately without retry', async () => {
    const mockFn = vi.fn().mockRejectedValue({ status: 500, message: 'Internal Server Error' });

    await expect(retryWithBackoff(mockFn)).rejects.toEqual({ status: 500, message: 'Internal Server Error' });

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(timeUtils.wait).not.toHaveBeenCalled();
  });

  it('when headers provided then extracts info and calls callback', async () => {
    const mockFn = createRateLimitMock('10000', {
      'x-ratelimit-limit': '100',
      'x-ratelimit-remaining': '0',
    });

    const onRetry = vi.fn();

    await retryWithBackoff(mockFn, { onRetry });

    expect(timeUtils.wait).toHaveBeenCalledWith(10000);
    expect(onRetry).toHaveBeenCalledWith(1, 10000, {
      retryAfter: 10000,
      limit: 100,
      remaining: 0,
    });
  });

  it('when headers missing or invalid then uses maxDelay fallback', async () => {
    const onRetry = vi.fn();

    const testCases = [
      { error: { status: 429 }, delay: 30000, onRetry },
      { error: { status: 429, headers: { 'x-ratelimit-reset': 'invalid' } }, delay: 20000 },
    ];

    for (const { error, delay, onRetry: callback } of testCases) {
      const mockFn = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('success');
      const options = callback ? { maxDelay: delay, onRetry: callback } : { maxDelay: delay };
      await retryWithBackoff(mockFn, options);
      expect(timeUtils.wait).toHaveBeenCalledWith(delay);
      if (callback) {
        expect(callback).toHaveBeenCalledWith(1, delay, undefined);
      }
      vi.clearAllMocks();
    }
  });

  it('when max retries exceeded then throws original error', async () => {
    const error = new Error('Rate limit exceeded');
    Object.assign(error, { status: 429, headers: { 'x-ratelimit-reset': '1000' } });
    const mockFn = vi.fn().mockRejectedValue(error);

    await expect(retryWithBackoff(mockFn, { maxRetries: 2 })).rejects.toThrow('Rate limit exceeded');

    expect(mockFn).toHaveBeenCalledTimes(3);
    expect(timeUtils.wait).toHaveBeenCalledTimes(2);
  });

  it('when error is not an object then throws immediately without retry', async () => {
    const testCases = ['string error', null];

    for (const error of testCases) {
      const mockFn = vi.fn().mockRejectedValue(error);
      await expect(retryWithBackoff(mockFn)).rejects.toBe(error);
      expect(mockFn).toHaveBeenCalledTimes(1);
      vi.clearAllMocks();
    }

    expect(timeUtils.wait).not.toHaveBeenCalled();
  });
});
