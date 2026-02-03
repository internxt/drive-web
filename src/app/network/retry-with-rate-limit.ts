import { wait } from 'utils/timeUtils';

export interface RateLimitInfo {
  retryAfter: number;
  limit?: number;
  remaining?: number;
}

export interface RetryOptions {
  maxRetries?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, delay: number, rateLimitInfo?: RateLimitInfo) => void;
}

interface ErrorWithStatus {
  status?: number;
  statusCode?: number;
  message?: string;
  response?: {
    status?: number;
  };
  headers?: Record<string, string>;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 5,
  maxDelay: 60000,
  onRetry: () => {},
};

function isErrorWithStatus(error: unknown): error is ErrorWithStatus {
  return typeof error === 'object' && error !== null;
}

function isRateLimitError(error: unknown): boolean {
  if (!isErrorWithStatus(error)) {
    return false;
  }

  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';

  return (
    error.status === 429 ||
    error.statusCode === 429 ||
    error.response?.status === 429 ||
    message.includes('429') ||
    message.includes('too many requests')
  );
}

function extractRateLimitInfo(error: unknown): RateLimitInfo | undefined {
  if (!isErrorWithStatus(error) || !error.headers) {
    return undefined;
  }

  const headers = error.headers;

  if (!headers['x-ratelimit-reset']) {
    return undefined;
  }

  const resetValueMs = Number.parseInt(headers['x-ratelimit-reset'], 10);
  if (Number.isNaN(resetValueMs)) {
    return undefined;
  }

  const limit = headers['x-ratelimit-limit'] ? Number.parseInt(headers['x-ratelimit-limit'], 10) : undefined;
  const remaining = headers['x-ratelimit-remaining']
    ? Number.parseInt(headers['x-ratelimit-remaining'], 10)
    : undefined;

  return {
    retryAfter: resetValueMs,
    limit,
    remaining,
  };
}

export async function retryWithBackoff<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      if (attempt === opts.maxRetries) {
        throw error;
      }

      if (!isRateLimitError(error)) {
        throw error;
      }

      const rateLimitInfo = extractRateLimitInfo(error);
      const delayMs = rateLimitInfo ? rateLimitInfo.retryAfter : opts.maxDelay;

      opts.onRetry(attempt + 1, delayMs, rateLimitInfo);

      await wait(delayMs);
    }
  }

  throw new Error('Maximum retries exceeded');
}
