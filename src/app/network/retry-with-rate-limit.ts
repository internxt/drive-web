import { wait } from 'utils/timeUtils';
import { HTTP_CODES } from 'app/core/constants';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { t } from 'i18next';

let hasShownRateLimitToast = false;
export interface RateLimitInfo {
  retryAfter: number;
}

export interface RetryOptions {
  maxRetries?: number;
  onRetry?: (attempt: number, delay: number, rateLimitInfo?: RateLimitInfo) => void;
}

interface ErrorWithStatus {
  status?: number;
  statusCode?: number;
  message?: string;
  response?: {
    status?: number;
    headers?: Record<string, string>;
  };
  headers?: Record<string, string>;
}

const isErrorWithStatus = (error: unknown): error is ErrorWithStatus => {
  return typeof error === 'object' && error !== null;
};

const isRateLimitError = (error: unknown): boolean => {
  if (!isErrorWithStatus(error)) {
    return false;
  }
  return error.status === HTTP_CODES.TOO_MANY_REQUESTS || error.response?.status === HTTP_CODES.TOO_MANY_REQUESTS;
};

const extractRateLimitInfo = (error: ErrorWithStatus): RateLimitInfo | undefined => {
  const headers = error.headers;
  const resetHeader = headers?.['x-internxt-ratelimit-reset'];
  if (!resetHeader) {
    return undefined;
  }

  const resetValueMs = Number.parseInt(resetHeader, 10);
  if (Number.isNaN(resetValueMs)) {
    return undefined;
  }

  return {
    retryAfter: resetValueMs,
  };
};

/**
 * Retries a function when it encounters a rate limit error (429).
 * Uses the retry-after value from the x-ratelimit-reset header to wait before retrying.
 *
 * @param fn - The async function to execute with retry logic
 * @param options - Configuration options for retry behavior
 * @param options.maxRetries - Maximum number of retry attempts (default: 5)
 * @param options.onRetry - Callback invoked before each retry with attempt number, delay, and rate limit info
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

      const rateLimitInfo = extractRateLimitInfo(error as ErrorWithStatus);

      if (!rateLimitInfo) {
        throw error;
      }

      if (!hasShownRateLimitToast) {
        hasShownRateLimitToast = true;
        notificationsService.show({
          text: t('shared-links.toast.rate-limit-retry'),
          type: ToastType.Warning,
        });
      }

      opts.onRetry(attempt + 1, rateLimitInfo.retryAfter, rateLimitInfo);

      await wait(rateLimitInfo.retryAfter);
    }
  }

  return await fn();
};
