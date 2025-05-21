/**
 * @jest-environment jsdom
 */

import { getPBKDF2, passToHash } from '../../../src/app/crypto/services/utils';

import { describe, expect, it } from 'vitest';
import CryptoJS from 'crypto-js';

describe('Test getPBKDF2 with RFC 6070 test vectors', () => {
  it('getPBKDF2 should pass test 1 for PBKDF2-HMAC-SHA-1 from RFC 6070', async () => {
    const password = 'password';
    const salt = 'salt';
    const iterations = 1;
    const hashLength = 20;
    const result = await getPBKDF2(password, salt, iterations, hashLength);
    const testResult = '0c60c80f961f0e71f3a9b524af6012062fe037a6';
    expect(result).toBe(testResult);
  });

  it('getPBKDF2 should pass test 2 for PBKDF2-HMAC-SHA-1 from RFC 6070', async () => {
    const password = 'password';
    const salt = 'salt';
    const iterations = 2;
    const hashLength = 20;
    const result = await getPBKDF2(password, salt, iterations, hashLength);
    const testResult = 'ea6c014dc72d6f8ccd1ed92ace1d41f0d8de8957';
    expect(result).toBe(testResult);
  });

  it('getPBKDF2 should pass test 3 for PBKDF2-HMAC-SHA-1 from RFC 6070', async () => {
    const password = 'password';
    const salt = 'salt';
    const iterations = 4096;
    const hashLength = 20;
    const result = await getPBKDF2(password, salt, iterations, hashLength);
    const testResult = '4b007901b765489abead49d926f721d065a429c1';
    expect(result).toBe(testResult);
  });

  /*it('getPBKDF2 should pass test 4 for PBKDF2-HMAC-SHA-1 from RFC 6070', async () => {
    const password = 'password';
    const salt = 'salt';
    const iterations = 16777216;
    const hashLength = 20;
    const result = await getPBKDF2(password, salt, iterations, hashLength);
    const testResult = 'eefe3d61cd4da4e4e9945b3d6ba2158c2634e984';
    expect(result).toBe(testResult);
  });*/

  it('getPBKDF2 should pass test 5 for PBKDF2-HMAC-SHA-1 from RFC 6070', async () => {
    const password = 'passwordPASSWORDpassword';
    const salt = 'saltSALTsaltSALTsaltSALTsaltSALTsalt';
    const iterations = 4096;
    const hashLength = 25;
    const result = await getPBKDF2(password, salt, iterations, hashLength);
    const testResult = '3d2eec4fe41c849b80c8d83662c0e44a8b291a964cf2f07038';
    expect(result).toBe(testResult);
  });

  it('getPBKDF2 should pass test 6 for PBKDF2-HMAC-SHA-1 from RFC 6070', async () => {
    const password = 'pass\0word';
    const salt = 'sa\0lt';
    const iterations = 4096;
    const hashLength = 16;
    const result = await getPBKDF2(password, salt, iterations, hashLength);
    const testResult = '56fa6aa75548099dcc37d7f03425e0c3';
    expect(result).toBe(testResult);
  });
});

describe('Test against other crypto libraries', () => {
  it('PBKDF2 should be identical to CryptoJS result for a test string', async () => {
    const password = 'Test between hash-wasm and CryptoJS';
    const salt = 'This is salt';
    const result = await getPBKDF2(password, salt);
    const cryptoJSresult = CryptoJS.PBKDF2(password, salt, { keySize: 256 / 32, iterations: 10000 }).toString(
      CryptoJS.enc.Hex,
    );
    expect(result).toBe(cryptoJSresult);
  });

  it('PBKDF2 should be identical to CryptoJS result for an empty string', async () => {
    const password = '';
    const salt = 'This is salt';
    const result = await getPBKDF2(password, salt);
    const cryptoJSresult = CryptoJS.PBKDF2(password, salt, { keySize: 256 / 32, iterations: 10000 }).toString(
      CryptoJS.enc.Hex,
    );
    expect(result).toBe(cryptoJSresult);
  });
});

describe('Test passToHash', () => {
  it('passToHash should return the same result for the same pwd and salt', async () => {
    const password = 'Test password';
    const salt = '6c7c6b9938cb8bd0baf1c2d2171b96a0';
    const result1 = await passToHash({ password, salt });
    const result2 = await passToHash({ password, salt });
    expect(result1.hash).toBe(result2.hash);
    expect(result1.salt).toBe(result2.salt);
  });

  it('passToHash should return the same result when re-computed', async () => {
    const password = 'Test password';
    const salt = 'argon2id$6c7c6b9938cb8bd0baf1c2d2171b96a0';
    const result1 = await passToHash({ password, salt });
    const result2 = await passToHash({ password, salt: result1.salt });
    expect(result1.hash).toBe(result2.hash);
    expect(result1.salt).toBe(result2.salt);
  });

  interface PassObjectInterface {
    salt?: string | null;
    password: string;
  }

  function oldPassToHash(passObject: PassObjectInterface): { salt: string; hash: string } {
    const salt = passObject.salt ? CryptoJS.enc.Hex.parse(passObject.salt) : CryptoJS.lib.WordArray.random(128 / 8);
    const hash = CryptoJS.PBKDF2(passObject.password, salt, { keySize: 256 / 32, iterations: 10000 });
    const hashedObjetc = {
      salt: salt.toString(),
      hash: hash.toString(),
    };

    return hashedObjetc;
  }

  it('passToHash should return the same result as the old function', async () => {
    const password = 'Test password';
    const salt = '7121910994f21cd848c55e90835d7bd8';

    const result = await passToHash({ password, salt });
    const oldResult = oldPassToHash({ password, salt });
    expect(result.salt).toBe(oldResult.salt);
    expect(result.hash).toBe(oldResult.hash);
  });

  it('passToHash should sucessfully verify old function hash', async () => {
    const password = 'Test password';
    const oldResult = oldPassToHash({ password });
    const result = await passToHash({ password, salt: oldResult.salt });

    expect(result.salt).toBe(oldResult.salt);
    expect(result.hash).toBe(oldResult.hash);
  });
});
