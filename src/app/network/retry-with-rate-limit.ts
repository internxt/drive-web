import { wait } from 'utils/timeUtils';
import { HTTP_CODES } from 'app/core/constants';

export interface RetryOptions {
  maxRetries?: number;
  onRetry?: (attempt: number, delay: number) => void;
}

interface ErrorWithStatus {
  status?: number;
  headers?: Record<string, string>;
}

const isErrorWithStatus = (error: unknown): error is ErrorWithStatus => {
  return typeof error === 'object' && error !== null;
};

const isRateLimitError = (error: unknown): boolean => {
  if (!isErrorWithStatus(error)) {
    return false;
  }
  return error.status === HTTP_CODES.TOO_MANY_REQUESTS;
};

const extractRetryAfter = (error: ErrorWithStatus): number | undefined => {
  const headers = error.headers;
  const resetHeader = headers?.['x-internxt-ratelimit-reset'];
  if (!resetHeader) {
    return undefined;
  }

  const resetValueMs = Number.parseInt(resetHeader, 10);
  if (Number.isNaN(resetValueMs)) {
    return undefined;
  }

  return resetValueMs;
};

/**
 * Retries a function when it encounters a rate limit error (429).
 * Uses the retry-after value from the x-internxt-ratelimit-reset header to wait before retrying.
 *
 * @param fn - The async function to execute with retry logic
 * @param options - Configuration options for retry behavior
 * @param options.maxRetries - Maximum number of retry attempts (default: 5)
 * @param options.onRetry - Optional callback invoked before each retry with attempt number and retry after value
 * @returns The result of the function if successful
 * @throws The original error if it's not a rate limit error, if max retries exceeded, or if rate limit headers are missing
 */
export const retryWithBackoff = async <T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> => {
  const opts = {
    maxRetries: 5,
    onRetry: () => {},
    ...options,
  };

  for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      if (!isRateLimitError(error)) {
        throw error;
      }

      const retryAfter = extractRetryAfter(error as ErrorWithStatus);

      if (!retryAfter) {
        throw error;
      }

      opts.onRetry(attempt + 1, retryAfter);

      await wait(retryAfter);
    }
  }

  return await fn();
};
