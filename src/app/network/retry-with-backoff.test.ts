import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retryWithBackoff, RetryReason } from './retry-with-backoff';
import * as timeUtils from 'utils/timeUtils';
import { ConnectionLostError } from './requests';

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

  it('when error is not retryable then throws immediately without retry', async () => {
    const mockFn = vi.fn().mockRejectedValue({ status: 400, message: 'Bad Request' });

    await expect(retryWithBackoff(mockFn)).rejects.toEqual({ status: 400, message: 'Bad Request' });

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(timeUtils.wait).not.toHaveBeenCalled();
  });

  it('when rate limited multiple times then calls onRetry for each retry with reason', async () => {
    const error = createRateLimitError('1000');
    const mockFn = vi.fn().mockRejectedValueOnce(error).mockRejectedValueOnce(error).mockResolvedValueOnce('success');

    const onRetry = vi.fn();

    const result = await retryWithBackoff(mockFn, { onRetry });

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, 1000, RetryReason.RateLimit);
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, 1000, RetryReason.RateLimit);
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

  it('when error is string then throws immediately', async () => {
    const mockFn = vi.fn().mockRejectedValue('string error');

    await expect(retryWithBackoff(mockFn)).rejects.toBe('string error');
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(timeUtils.wait).not.toHaveBeenCalled();
  });

  it('when server error occurs then retries and succeeds', async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce({ status: 500, message: 'Server Error' })
      .mockResolvedValueOnce('success');

    const result = await retryWithBackoff(mockFn);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(timeUtils.wait).toHaveBeenCalledTimes(1);
  });

  it('when CORS error occurs then retries and succeeds', async () => {
    const mockFn = vi.fn().mockRejectedValueOnce({ message: 'cors error' }).mockResolvedValueOnce('success');

    const result = await retryWithBackoff(mockFn);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(timeUtils.wait).toHaveBeenCalledTimes(1);
  });

  it('when network error occurs then retries and succeeds', async () => {
    const mockFn = vi.fn().mockRejectedValueOnce(new ConnectionLostError()).mockResolvedValueOnce('success');

    const result = await retryWithBackoff(mockFn);

    expect(result).toBe('success');
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(timeUtils.wait).toHaveBeenCalledTimes(1);
  });

  it('when server error occurs then notifies with correct reason', async () => {
    const mockFn = vi
      .fn()
      .mockRejectedValueOnce({ status: 503, message: 'server unavailable' })
      .mockResolvedValueOnce('success');
    const onRetry = vi.fn();

    const result = await retryWithBackoff(mockFn, { onRetry });

    expect(result).toBe('success');
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Number), RetryReason.ServerError);
  });

  it('when server error persists then throws after max retries', async () => {
    const mockFn = vi.fn().mockRejectedValue({ status: 500, message: 'Server Error' });

    await expect(retryWithBackoff(mockFn, { maxRetries: 2 })).rejects.toEqual({ status: 500, message: 'Server Error' });

    expect(mockFn).toHaveBeenCalledTimes(3);
    expect(timeUtils.wait).toHaveBeenCalledTimes(2);
  });
});
