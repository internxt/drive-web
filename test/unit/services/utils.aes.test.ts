/**
 * @jest-environment jsdom
 */

import {
  encryptText,
  encryptTextWithKey,
  decryptText,
  decryptTextWithKey,
} from '../../../src/app/crypto/services/utils';

import { describe, expect, it, afterAll, beforeAll } from 'vitest';
import CryptoJS from 'crypto-js';
import { Buffer } from 'buffer';

describe('Test encryption', () => {
  globalThis.Buffer = Buffer;
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

  function oldEncryptTextWithKey(textToEncrypt: string, keyToEncrypt: string): string {
    const bytes = CryptoJS.AES.encrypt(textToEncrypt, keyToEncrypt).toString();
    const text64 = CryptoJS.enc.Base64.parse(bytes);
    return text64.toString(CryptoJS.enc.Hex);
  }

  function oldDecryptTextWithKey(encryptedText: string, keyToDecrypt: string): string {
    if (!keyToDecrypt) {
      throw new Error('No key defined. Check .env file');
    }
    const reb = CryptoJS.enc.Hex.parse(encryptedText);
    const bytes = CryptoJS.AES.decrypt(reb.toString(CryptoJS.enc.Base64), keyToDecrypt);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  it('decryptTextWithKey should give the same result as before', async () => {
    const message = 'Test message';
    const key = '123456789QWERTY';
    const ciphertext = encryptTextWithKey(message, key);
    const result = decryptTextWithKey(ciphertext, key);
    const oldResult = oldDecryptTextWithKey(ciphertext, key);
    expect(result).toBe(oldResult);
  });

  it('decryptTextWithKey should decrypt old ciphertext', async () => {
    const message = 'Test message';
    const key = '123456789QWERTY';
    const ciphertext = oldEncryptTextWithKey(message, key);
    const result = decryptTextWithKey(ciphertext, key);
    expect(result).toBe(message);
  });

  it('encryptTextWithKey should work with old decrypt', async () => {
    const message = 'Test message';
    const key = '123456789QWERTY';
    const ciphertext = encryptTextWithKey(message, key);
    const result = oldDecryptTextWithKey(ciphertext, key);
    expect(result).toBe(message);
  });
});
