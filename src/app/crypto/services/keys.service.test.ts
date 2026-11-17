import { AppError } from '@internxt/sdk';
import { describe, expect, test } from 'vitest';
import {
  Base64EncodedPrivateKeyError,
  CorruptedEncryptedPrivateKeyError,
  isAccountKeysError,
  KeysDoNotMatchError,
  WrongIterationsToEncryptPrivateKeyError,
} from './keys.service';

describe('isAccountKeysError', () => {
  test.each([
    ['the private key was stored base64 encoded', new Base64EncodedPrivateKeyError()],
    ['the private key was encrypted with the wrong iteration count', new WrongIterationsToEncryptPrivateKeyError()],
    ['the private key cannot be decrypted', new CorruptedEncryptedPrivateKeyError()],
    ['the public and private keys do not match', new KeysDoNotMatchError()],
  ])('when %s, then it is reported as an account keys problem', (_situation, error) => {
    expect(isAccountKeysError(error)).toBe(true);
  });

  test.each([
    ['the error is unexpected', new Error('boom')],
    ['the error comes from the server', new AppError('boom', 500)],
    ['the thrown value is not an error', 'boom'],
  ])('when %s, then it is not reported as an account keys problem', (_situation, error) => {
    expect(isAccountKeysError(error)).toBe(false);
  });

  test('when the key pair does not match, then it is not reported as a corrupted key', () => {
    const error = new KeysDoNotMatchError();

    expect(error).toBeInstanceOf(KeysDoNotMatchError);
    expect(error).not.toBeInstanceOf(CorruptedEncryptedPrivateKeyError);
  });
});
