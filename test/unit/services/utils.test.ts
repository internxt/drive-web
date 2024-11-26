/**
 * @jest-environment jsdom
 */

import {
  getSha256,
  getSha256Hasher,
  passToHash,
  encryptText,
  decryptText,
  decryptTextWithKey,
  getRipemd160FromHex,
} from '../../../src/app/crypto/services/utils';

import { describe, expect, it, afterAll, beforeAll } from 'vitest';
import { Sha256 } from 'asmcrypto.js';
import CryptoJS from 'crypto-js';
import { Buffer } from 'buffer';
import crypto from 'crypto';

describe('Test getSha256 with NIST test vectors', () => {
  it('getSha256 should pass NIST test vector 1', async () => {
    const message = 'abc';
    const result = await getSha256(message);
    const testResult = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
    expect(result).toBe(testResult);
  });

  it('getSha256 should pass NIST test vector 2', async () => {
    const message = '';
    const result = await getSha256(message);
    const testResult = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    expect(result).toBe(testResult);
  });

  it('getSha256 should pass NIST test vector 3', async () => {
    const message = 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq';
    const result = await getSha256(message);
    const testResult = '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1';
    expect(result).toBe(testResult);
  });

  it('getSha256 should pass NIST test vector 4', async () => {
    const message =
      'abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu';
    const result = await getSha256(message);
    const testResult = 'cf5b16a778af8380036ce59e7b0492370b249b11e8f07a51afac45037afee9d1';
    expect(result).toBe(testResult);
  });

  it('getSha256 should pass NIST test vector 5', async () => {
    let message = '';
    for (let i = 0; i < 1000000; i++) {
      message += 'a';
    }
    const result = await getSha256(message);
    const testResult = 'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0';
    expect(result).toBe(testResult);
  });
});

describe('Test getSha256Hasher', () => {
  it('getSha256Hasher should give the same result as getSha256 for a single string', async () => {
    const message = 'Test message';
    const hasher = await getSha256Hasher();
    hasher.init();
    hasher.update(message);
    const result = hasher.digest();
    const expectedResult = await getSha256(message);
    expect(result).toBe(expectedResult);
  });

  it('getSha256Hasher should give the same result as getSha256 for an array', async () => {
    const messageArray = ['Test message 1', 'Test message 2', 'Test message 3', 'Test message 4'];
    const hasher = await getSha256Hasher();
    hasher.init();
    for (const message of messageArray) {
      hasher.update(message);
    }
    const result = hasher.digest();
    const expectedResult = await getSha256(messageArray.join(''));
    expect(result).toBe(expectedResult);
  });

  it('getSha256 should return the same result as asmcrypto.js', async () => {
    const messageArray = ['Test message 1', 'Test message 2', 'Test message 3', 'Test message 4'];
    const hasher = await getSha256Hasher();
    hasher.init();
    for (const message of messageArray) {
      hasher.update(Buffer.from(message));
    }
    const hashWasnResultStr = hasher.digest();
    const hashWasnResult = new Uint8Array(Buffer.from(hashWasnResultStr, 'hex'));

    const asmcryptoHasher = new Sha256();
    for (const message of messageArray) {
      asmcryptoHasher.process(Buffer.from(message));
    }
    asmcryptoHasher.finish();
    const asmcryptoResult = asmcryptoHasher.result;

    expect(hashWasnResult).toStrictEqual(asmcryptoResult);
  });
});

describe('Test against other crypto libraries', () => {
  it('SHA256 should be identical to CryptoJS result for a test string', async () => {
    const message = 'Test between hash-wasm and CryptoJS';
    const result = await getSha256(message);
    const cryptoJSresult = CryptoJS.SHA256(message).toString(CryptoJS.enc.Hex);
    expect(result).toBe(cryptoJSresult);
  });

  it('SHA256 should be identical to CryptoJS result for an empty string', async () => {
    const message = '';
    const result = await getSha256(message);
    const cryptoJSresult = CryptoJS.SHA256(message).toString(CryptoJS.enc.Hex);
    expect(result).toBe(cryptoJSresult);
  });

  it('getRipemd160 should retrun the same result as crypto', async () => {
    const sha256Result = await getSha256('Test message');
    const result = await getRipemd160FromHex(sha256Result);
    const testResult = crypto.createHash('ripemd160').update(Buffer.from(sha256Result, 'hex')).digest('hex');
    expect(result).toBe(testResult);
  });
});

describe('Test passToHash', () => {
  it('passToHash should return the same result when called twice for the same pwd and salt', async () => {
    const password = 'Test password';
    const salt = '6c7c6b9938cb8bd0baf1c2d2171b96a0';
    const result1 = await passToHash({ password, salt });
    const result2 = await passToHash({ password, salt: result1.salt });
    expect(result1.hash).toBe(result2.hash);
    expect(result1.salt).toBe(result2.salt);
  });

  it('passToHash should generate salt when no salt given and sicessfully verify the result', async () => {
    const password = 'Test password';
    const result1 = await passToHash({ password });
    const result2 = await passToHash({ password, salt: result1.salt });
    expect(result1.hash).toBe(result2.hash);
    expect(result1.salt).toBe(result2.salt);
  });
});

describe('Test encryption', () => {
  if (typeof globalThis.process === 'undefined') {
    globalThis.process = { env: {} } as any;
  }
  const originalEnv = process.env.REACT_APP_CRYPTO_SECRET;

  beforeAll(() => {
    process.env.REACT_APP_CRYPTO_SECRET = '123456789QWERTY';
  });
  afterAll(() => {
    process.env.REACT_APP_CRYPTO_SECRET = originalEnv;
  });

  it('Should be able to encrypt and decrypt', async () => {
    const message = 'Test message';
    expect(process.env.REACT_APP_CRYPTO_SECRET, '123456789QWERTY');
    const ciphertext = encryptText(message);
    const result = decryptText(ciphertext);
    expect(result).toBe(message);
  });

  it('decryptTextWithKey should fail with an empty key', async () => {
    const message = 'Test message';
    const ciphertext = encryptText(message);
    expect(() => decryptTextWithKey(ciphertext, '')).toThrowError('No key defined. Check .env file');
  });
});

describe('Test getRipemd160 with test vectors published by the authors', () => {
  it('getRipemd160 should pass test 1', async () => {
    const message = '';
    const result = await getRipemd160FromHex(message);
    const testResult = '9c1185a5c5e9fc54612808977ee8f548b2258d31';
    expect(result).toBe(testResult);
  });

  it('getRipemd160 should pass test 2', async () => {
    const message = Buffer.from('a').toString('hex');
    const result = await getRipemd160FromHex(message);
    const testResult = '0bdc9d2d256b3ee9daae347be6f4dc835a467ffe';
    expect(result).toBe(testResult);
  });

  it('getRipemd160 should pass test 3', async () => {
    const message = Buffer.from('abc').toString('hex');
    const result = await getRipemd160FromHex(message);
    const testResult = '8eb208f7e05d987a9b044a8e98c6b087f15a0bfc';
    expect(result).toBe(testResult);
  });

  it('getRipemd160 should pass test 4', async () => {
    const message = Buffer.from('message digest').toString('hex');
    const result = await getRipemd160FromHex(message);
    const testResult = '5d0689ef49d2fae572b881b123a85ffa21595f36';
    expect(result).toBe(testResult);
  });

  it('getRipemd160 should pass test 5', async () => {
    const message = Buffer.from('abcdefghijklmnopqrstuvwxyz').toString('hex');
    const result = await getRipemd160FromHex(message);
    const testResult = 'f71c27109c692c1b56bbdceb5b9d2865b3708dbc';
    expect(result).toBe(testResult);
  });

  it('getRipemd160 should pass test 6', async () => {
    const message = Buffer.from('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq').toString('hex');
    const result = await getRipemd160FromHex(message);
    const testResult = '12a053384a9c0c88e405a06c27dcf49ada62eb2b';
    expect(result).toBe(testResult);
  });

  it('getRipemd160 should pass test 7', async () => {
    const message = Buffer.from('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789').toString('hex');
    const result = await getRipemd160FromHex(message);
    const testResult = 'b0e20b6e3116640286ed3a87a5713079b21f5189';
    expect(result).toBe(testResult);
  });

  it('getRipemd160 should pass test 8', async () => {
    let message = '';
    for (let i = 0; i < 8; i++) {
      message += Buffer.from('1234567890').toString('hex');
    }
    const result = await getRipemd160FromHex(message);
    const testResult = '9b752e45573d4b39f4dbd3323cab82bf63326bfb';
    expect(result).toBe(testResult);
  });

  it('getRipemd160 should pass test 9', async () => {
    let message = '';
    for (let i = 0; i < 1000000; i++) {
      message += Buffer.from('a').toString('hex');
    }
    const result = await getRipemd160FromHex(message);
    const testResult = '52783243c1697bdbe16d37f97f68f08325dc1528';
    expect(result).toBe(testResult);
  });
});
