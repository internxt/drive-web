import { AppError } from '@internxt/sdk';

type Translate = (key: string) => string;

const NETWORK_ERROR_CODES = new Set(['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET', 'ERR_CANCELED']);
const NETWORK_ERROR_MESSAGE = /network error|timeout|failed to fetch|load failed/i;
const AXIOS_DEFAULT_MESSAGE = /^Request failed with status code \d+$/;
const GARBLED_MESSAGE = /^\[object \w+\]$/;

/**
 * Maps a login failure to the text shown in the form.
 *
 * - No response or timeout (network error code, or no status plus a network-like message): connection lost.
 * - A real HTTP status is never overridden by message text (a 504 "Gateway Timeout" is a server error).
 * - 4xx (including 429) with a meaningful server message: that message, untouched.
 * - Everything else (5xx, blank/garbled/default axios text, client crash on a malformed response): generic server error.
 */
export const getLoginErrorMessage = (error: AppError, translate: Translate): string => {
  const message = error.message?.trim() ?? '';
  const hasNetworkCode = error.code !== undefined && NETWORK_ERROR_CODES.has(error.code);
  const hasNoResponse = error.status === undefined;
  const isNetworkFailure = hasNetworkCode || (hasNoResponse && NETWORK_ERROR_MESSAGE.test(message));
  if (isNetworkFailure) return translate('error.connectionLostError');

  const isClientError = error.status !== undefined && error.status >= 400 && error.status < 500;
  const isMeaningfulMessage = message !== '' && !AXIOS_DEFAULT_MESSAGE.test(message) && !GARBLED_MESSAGE.test(message);
  if (isClientError && isMeaningfulMessage) return error.message;

  return translate('error.serverError');
};
