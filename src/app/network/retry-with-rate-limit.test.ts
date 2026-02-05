import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retryWithBackoff } from './retry-with-rate-limit';
import * as timeUtils from 'utils/timeUtils';

vi.mock('utils/timeUtils', () => ({
  wait: vi.fn(() => Promise.resolve()),
}));

const createRateLimitError = (resetDelay: string, additionalHeaders?: Record<string, string>) => ({
  status: 429,
  headers: { 'x-internxt-ratelimit-reset': resetDelay, ...additionalHeaders },
});

const createRateLimitMock = (resetDelay: string, additionalHeaders?: Record<string, string>) =>
  vi.fn().mockRejectedValueOnce(createRateLimitError(resetDelay, additionalHeaders)).mockResolvedValueOnce('success');

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

  it('when error is not rate limit then throws immediately without retry', async () => {
    const mockFn = vi.fn().mockRejectedValue({ status: 500, message: 'Internal Server Error' });

    await expect(retryWithBackoff(mockFn)).rejects.toEqual({ status: 500, message: 'Internal Server Error' });

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(timeUtils.wait).not.toHaveBeenCalled();
  });

  it('when rate limited multiple times then calls onRetry for each retry', async () => {
    const error = createRateLimitError('1000');
    const mockFn = vi.fn().mockRejectedValueOnce(error).mockRejectedValueOnce(error).mockResolvedValueOnce('success');

    const onRetry = vi.fn();

    const result = await retryWithBackoff(mockFn, { onRetry });

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, 1000);
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, 1000);
  });

  it('when headers missing or invalid then throws error', async () => {
    const testCases = [
      { status: 429 },
      { status: 429, headers: {} },
      { status: 429, headers: { 'x-internxt-ratelimit-reset': 'invalid' } },
    ];

    for (const error of testCases) {
      const mockFn = vi.fn().mockRejectedValue(error);
      await expect(retryWithBackoff(mockFn)).rejects.toEqual(error);
      expect(mockFn).toHaveBeenCalledTimes(1);
      vi.clearAllMocks();
    }
  });

  it('when max retries exceeded then throws original error', async () => {
    const error = new Error('Rate limit exceeded');
    Object.assign(error, { status: 429, headers: { 'x-internxt-ratelimit-reset': '1000' } });
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
