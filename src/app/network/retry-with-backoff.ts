import { wait } from 'utils/timeUtils';
import { HTTP_CODES, ErrorMessages } from 'app/core/constants';
import errorService from 'services/error.service';
import { ConnectionLostError } from './requests';
import { randomBytes } from 'crypto';

export enum RetryReason {
  RateLimit = 'RATE-LIMIT',
  ServerError = 'SERVER-ERROR',
}

export interface RetryOptions {
  maxRetries?: number;
  onRetry?: (attempt: number, delayMs: number, reason: RetryReason) => void;
}

interface ErrorWithStatus {
  status?: number;
  headers?: Record<string, string>;
}

const hasStatusProperty = (error: unknown): error is ErrorWithStatus => {
  return typeof error === 'object' && error !== null;
};

const isRateLimitError = (error: unknown): boolean => {
  return hasStatusProperty(error) && error.status === HTTP_CODES.TOO_MANY_REQUESTS;
};

const NETWORK_ERROR_MESSAGES = new Set([
  ErrorMessages.ConnectionLost.toLowerCase(),
  ErrorMessages.NetworkError.toLowerCase(),
]);

const SERVER_ERROR_MESSAGES = new Set([
  ErrorMessages.ServerUnavailable.toLowerCase(),
  ErrorMessages.ServerError.toLowerCase(),
  ErrorMessages.InternalServerError.toLowerCase(),
]);

const isNetworkError = (error: unknown, message: string): boolean => {
  if (error instanceof ConnectionLostError) return true;
  return NETWORK_ERROR_MESSAGES.has(message);
};

const is5xxServerError = (message: string): boolean => {
  return SERVER_ERROR_MESSAGES.has(message);
};

const isCORSError = (message: string): boolean => {
  return message.includes(ErrorMessages.CORS);
};

const isRetryableServerError = (error: unknown): boolean => {
  const castedError = errorService.castError(error);
  const lowerCaseMessage = castedError.message.toLowerCase();

  return isNetworkError(error, lowerCaseMessage) || is5xxServerError(lowerCaseMessage) || isCORSError(lowerCaseMessage);
};

const INITIAL_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 10000;
const MAX_UINT32 = 0xffffffff;

const calculateExponentialBackoff = (attemptNumber: number): number => {
  const exponentialDelay = INITIAL_BACKOFF_MS * Math.pow(2, attemptNumber - 1);
  const cappedDelay = Math.min(exponentialDelay, MAX_BACKOFF_MS);
  const randomValue = randomBytes(4).readUInt32BE(0) / MAX_UINT32;
  return randomValue * cappedDelay;
};

const extractRateLimitDelay = (error: ErrorWithStatus): number | null => {
  const resetHeader = error.headers?.['x-internxt-ratelimit-reset'];
  if (!resetHeader) {
    return null;
  }

  const delayMs = Number.parseInt(resetHeader, 10);
  return Number.isNaN(delayMs) ? null : delayMs;
};

/**
 * Retries a function when it encounters retryable errors.
 *
 * Handles two types of retryable errors:
 * - Rate limit errors (429): Waits for the time specified in server's rate limit header
 * - Server/network errors (500s, CORS, network failures): Uses exponential backoff with jitter
 *
 * @param fn - The async function to retry on failure
 * @param options - Retry configuration
 * @param options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param options.onRetry - Callback invoked before each retry with attempt number and delay
 *
 * @returns The result of the function if successful
 * @throws The original error if it's not retryable or max retries exceeded
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   () => apiCall(),
 *   { maxRetries: 5, onRetry: (attempt, delay) => console.log(`Retry ${attempt}`) }
 * );
 * ```
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
      const currentAttempt = attempt + 1;

      if (isRateLimitError(error)) {
        const delayMs = extractRateLimitDelay(error as ErrorWithStatus);

        if (!delayMs) {
          throw error;
        }

        opts.onRetry(currentAttempt, delayMs, RetryReason.RateLimit);
        await wait(delayMs);
        continue;
      }

      if (isRetryableServerError(error)) {
        const delayMs = calculateExponentialBackoff(currentAttempt);
        opts.onRetry(currentAttempt, delayMs, RetryReason.ServerError);
        await wait(delayMs);
        continue;
      }

      throw error;
    }
  }

  return await fn();
};
