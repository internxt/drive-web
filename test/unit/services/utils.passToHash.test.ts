/**
 * @jest-environment jsdom
 */

import { getPBKDF2, getArgon2, passToHash, hex2oldEncoding } from '../../../src/app/crypto/services/utils';

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

  it('getPBKDF2 should pass test 4 for PBKDF2-HMAC-SHA-1 from RFC 6070', async () => {
    const password = 'password';
    const salt = 'salt';
    const iterations = 16777216;
    const hashLength = 20;
    const result = await getPBKDF2(password, salt, iterations, hashLength);
    const testResult = 'eefe3d61cd4da4e4e9945b3d6ba2158c2634e984';
    expect(result).toBe(testResult);
  });

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

describe('Test getArgon2 with test vectors from the reference implementation that won Password Hashing Competition', () => {
  it('getArgon2 should pass test 1', async () => {
    const password = 'password';
    const salt = 'somesalt';
    const parallelism = 1;
    const iterations = 2;
    const memorySize = 65536;
    const hashLength = 32;
    const result = await getArgon2(password, salt, parallelism, iterations, memorySize, hashLength, 'hex');
    const testResult = '09316115d5cf24ed5a15a31a3ba326e5cf32edc24702987c02b6566f61913cf7';
    expect(result).toBe(testResult);
  });

  it('getArgon2 should pass test 2', async () => {
    const password = 'password';
    const salt = 'somesalt';
    const parallelism = 1;
    const iterations = 2;
    const memorySize = 262144;
    const hashLength = 32;
    const result = await getArgon2(password, salt, parallelism, iterations, memorySize, hashLength, 'hex');
    const testResult = '78fe1ec91fb3aa5657d72e710854e4c3d9b9198c742f9616c2f085bed95b2e8c';
    expect(result).toBe(testResult);
  });

  it('getArgon2 should pass test 3', async () => {
    const password = 'password';
    const salt = 'somesalt';
    const parallelism = 1;
    const iterations = 2;
    const memorySize = 256;
    const hashLength = 32;
    const result = await getArgon2(password, salt, parallelism, iterations, memorySize, hashLength, 'hex');
    const testResult = '9dfeb910e80bad0311fee20f9c0e2b12c17987b4cac90c2ef54d5b3021c68bfe';
    expect(result).toBe(testResult);
  });

  it('getArgon2 should pass test 4', async () => {
    const password = 'password';
    const salt = 'somesalt';
    const parallelism = 2;
    const iterations = 2;
    const memorySize = 256;
    const hashLength = 32;
    const result = await getArgon2(password, salt, parallelism, iterations, memorySize, hashLength, 'hex');
    const testResult = '6d093c501fd5999645e0ea3bf620d7b8be7fd2db59c20d9fff9539da2bf57037';
    expect(result).toBe(testResult);
  });

  it('getArgon2 should pass test 5', async () => {
    const password = 'password';
    const salt = 'somesalt';
    const parallelism = 1;
    const iterations = 1;
    const memorySize = 65536;
    const hashLength = 32;
    const result = await getArgon2(password, salt, parallelism, iterations, memorySize, hashLength, 'hex');
    const testResult = 'f6a5adc1ba723dddef9b5ac1d464e180fcd9dffc9d1cbf76cca2fed795d9ca98';
    expect(result).toBe(testResult);
  });

  it('getArgon2 should pass test 6', async () => {
    const password = 'password';
    const salt = 'somesalt';
    const parallelism = 1;
    const iterations = 4;
    const memorySize = 65536;
    const hashLength = 32;
    const result = await getArgon2(password, salt, parallelism, iterations, memorySize, hashLength, 'hex');
    const testResult = '9025d48e68ef7395cca9079da4c4ec3affb3c8911fe4f86d1a2520856f63172c';
    expect(result).toBe(testResult);
  });

  it('getArgon2 should pass test 7', async () => {
    const password = 'differentpassword';
    const salt = 'somesalt';
    const parallelism = 1;
    const iterations = 2;
    const memorySize = 65536;
    const hashLength = 32;
    const result = await getArgon2(password, salt, parallelism, iterations, memorySize, hashLength, 'hex');
    const testResult = '0b84d652cf6b0c4beaef0dfe278ba6a80df6696281d7e0d2891b817d8c458fde';
    expect(result).toBe(testResult);
  });

  it('getArgon2 should pass test 8', async () => {
    const password = 'password';
    const salt = 'diffsalt';
    const parallelism = 1;
    const iterations = 2;
    const memorySize = 65536;
    const hashLength = 32;
    const result = await getArgon2(password, salt, parallelism, iterations, memorySize, hashLength, 'hex');
    const testResult = 'bdf32b05ccc42eb15d58fd19b1f856b113da1e9a5874fdcc544308565aa8141c';
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
  it('passToHash should be identical to getArgon2 for an empry salt', async () => {
    const password = 'Test password';
    const result = await passToHash({ password });
    const salt: string = result.salt.split('$').pop() ?? '';
    const argon2Result = await getArgon2(password, salt);
    expect(result.hash).toBe(argon2Result);
  });

  it('passToHash should be identical to getArgon2 in argon mode', async () => {
    const password = 'Test password';
    const salt = 'argon2id$6c7c6b9938cb8bd0baf1c2d2171b96a0';
    const result = await passToHash({ password, salt });
    const argon2Result = await getArgon2(password, '6c7c6b9938cb8bd0baf1c2d2171b96a0');
    expect(result.hash).toBe(argon2Result);
  });

  it('passToHash should be identical to getPBKDF2 in PBKDF2 mode', async () => {
    const password = 'Test password';
    const salt = '1238cb8bd0baf1c2d2171b96a0';
    const result = await passToHash({ password, salt });
    const encoded_salt = hex2oldEncoding(salt);
    const pbkdf2Result = await getPBKDF2(password, encoded_salt);
    expect(result.hash).toBe(pbkdf2Result);
  });

  it('passToHash should return the same result for the given password and salt (argon mode)', async () => {
    const password = 'Test password';
    const salt = 'argon2id$6c7c6b9938cb8bd0baf1c2d2171b96a0';
    const result1 = await passToHash({ password, salt });
    const result2 = await passToHash({ password, salt });
    expect(result1.hash).toBe(result2.hash);
    expect(result1.salt).toBe(result2.salt);
  });

  it('passToHash should return the same result for the same pwd and salt (PBKDF2)', async () => {
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

  it('passToHash should return the same result for PBKDF2 as the old function', async () => {
    const password = 'Test password';
    const salt = '7121910994f21cd848c55e90835d7bd8';

    const result = await passToHash({ password, salt });
    const oldResult = oldPassToHash({ password, salt });
    expect(result.salt).toBe(oldResult.salt);
    expect(result.hash).toBe(oldResult.hash);
  });

  it('passToHash should return sucessfully verify old function hash', async () => {
    const password = 'Test password';
    const oldResult = oldPassToHash({ password });
    const result = await passToHash({ password, salt: oldResult.salt });

    expect(result.salt).toBe(oldResult.salt);
    expect(result.hash).toBe(oldResult.hash);
  });

  it('passToHash should throw an error if salt is empty', async () => {
    const password = 'Test password';
    const salt = 'argon2id$';
    await expect(passToHash({ password, salt })).rejects.toThrow('Salt must be specified');
  });

  it('passToHash should throw an error if password is empty', async () => {
    const password = '';
    const salt = 'argon2id$6c7c6b9938cb8bd0baf1c2d2171b96a0';
    await expect(passToHash({ password, salt })).rejects.toThrow('Password must be specified');
  });

  it('passToHash should throw an error if salt is less than 8 bytes', async () => {
    const password = 'Test password';
    const salt = 'argon2id$6c';
    await expect(passToHash({ password, salt })).rejects.toThrow('Salt should be at least 8 bytes long');
  });
});
