import { AppError } from '@internxt/sdk';
import { describe, expect, test } from 'vitest';
import { getLoginErrorMessage } from './getLoginErrorMessage';

const translate = (key: string) => `t:${key}`;
const CONNECTION_LOST = 't:error.connectionLostError';
const SERVER_ERROR = 't:error.serverError';

const messageFor = (message: string, status?: number, code?: string) =>
  getLoginErrorMessage(new AppError(message, status, code), translate);

describe('Login error message', () => {
  test.each([
    ['Network Error', undefined, 'ERR_NETWORK'],
    ['timeout of 30000ms exceeded', undefined, 'ECONNABORTED'],
    ['timeout exceeded', undefined, undefined],
    ['Network Error', 500, 'ERR_NETWORK'],
  ])(
    'when the failure is "%s" (status %s, code %s), then it shows the connection lost message',
    (message, status, code) => {
      expect(messageFor(message, status, code)).toBe(CONNECTION_LOST);
    },
  );

  test.each([500, 522])('when the server answers %i, then it shows the server error message', (status) => {
    expect(messageFor(`Request failed with status code ${status}`, status)).toBe(SERVER_ERROR);
  });

  test.each([
    [504, 'Gateway Timeout'],
    [502, 'Bad Gateway'],
  ])('when the server answers %i with "%s", then it shows the server error message', (status, message) => {
    expect(messageFor(message, status)).toBe(SERVER_ERROR);
  });

  test.each([
    [400, ''],
    [400, '   '],
    [400, '[object Object]'],
    [400, 'Request failed with status code 400'],
    [429, 'Request failed with status code 429'],
  ])('when a %i has no meaningful message ("%s"), then it shows the server error message', (status, message) => {
    expect(messageFor(message, status)).toBe(SERVER_ERROR);
  });

  test('when a client-side crash has no status, then it shows the server error message', () => {
    expect(messageFor('Cannot read properties of undefined (reading sKey)')).toBe(SERVER_ERROR);
  });

  test.each([
    [401, 'Wrong login credentials', undefined],
    [400, 'Wrong 2-factor auth code', undefined],
    [400, 'email must be an email', undefined],
    [429, 'Too Many Requests', undefined],
    [403, 'Account blocked', 'ACCOUNT_BLOCKED'],
  ])('when the server answers %i with "%s" (code %s), then it keeps the server text', (status, message, code) => {
    expect(messageFor(message, status, code)).toBe(message);
  });
});
