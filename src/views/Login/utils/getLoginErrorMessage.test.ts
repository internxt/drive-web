import { AppError } from '@internxt/sdk';
import { describe, expect, test } from 'vitest';
import { getLoginErrorMessage } from './getLoginErrorMessage';

const translate = (key: string) => `t:${key}`;
const CONNECTION_LOST = 't:error.connectionLostError';
const SERVER_ERROR = 't:error.serverError';

describe('Login error message', () => {
  test.each([
    ['Network Error', undefined, 'ERR_NETWORK'],
    ['timeout of 30000ms exceeded', undefined, 'ECONNABORTED'],
    ['timeout exceeded', undefined, undefined],
    ['Network Error', 500, 'ERR_NETWORK'],
  ])('when the failure is "%s" (status %s, code %s), then it shows the connection lost message', (m, status, code) => {
    expect(getLoginErrorMessage(new AppError(m, status, code), translate)).toBe(CONNECTION_LOST);
  });

  test.each([500, 502, 503, 504, 522])(
    'when the server answers %i, then it shows the server error message',
    (status) => {
      expect(getLoginErrorMessage(new AppError(`Request failed with status code ${status}`, status), translate)).toBe(
        SERVER_ERROR,
      );
    },
  );

  test('when the server answers 504 with a "Gateway Timeout" message, then it shows the server error message', () => {
    expect(getLoginErrorMessage(new AppError('Gateway Timeout', 504), translate)).toBe(SERVER_ERROR);
  });

  test('when a 5xx carries a raw server text, then it shows the server error message', () => {
    expect(getLoginErrorMessage(new AppError('Bad Gateway', 502), translate)).toBe(SERVER_ERROR);
  });

  test.each(['', '   ', '[object Object]', 'Request failed with status code 400'])(
    'when the message is "%s", then it shows the server error message',
    (message) => {
      expect(getLoginErrorMessage(new AppError(message, 400), translate)).toBe(SERVER_ERROR);
    },
  );

  test('when a client-side crash has no status, then it shows the server error message', () => {
    const error = new AppError("Cannot read properties of undefined (reading 'sKey')");

    expect(getLoginErrorMessage(error, translate)).toBe(SERVER_ERROR);
  });

  test.each([
    [401, 'Wrong login credentials'],
    [400, 'Wrong 2-factor auth code'],
    [400, 'email must be an email'],
    [429, 'Too Many Requests'],
  ])('when the server answers %i with a message, then it keeps the server text', (status, message) => {
    expect(getLoginErrorMessage(new AppError(message, status), translate)).toBe(message);
  });

  test('when the account is blocked, then it keeps the server text', () => {
    const error = new AppError('Account blocked', 403, 'ACCOUNT_BLOCKED');

    expect(getLoginErrorMessage(error, translate)).toBe('Account blocked');
  });

  test('when a 429 has only the default axios text, then it shows the server error message', () => {
    expect(getLoginErrorMessage(new AppError('Request failed with status code 429', 429), translate)).toBe(
      SERVER_ERROR,
    );
  });
});
