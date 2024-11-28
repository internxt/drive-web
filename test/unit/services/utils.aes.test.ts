/**
 * @jest-environment jsdom
 */

import {
  encryptText,
  encryptTextWithKey,
  decryptText,
  decryptTextWithKey,
  hex2oldEncoding,
  uint8ArrayToBase64,
  base64ToHex,
  wordArrayToUtf8String,
} from '../../../src/app/crypto/services/utils';

import { describe, expect, it, afterAll, beforeAll } from 'vitest';
import CryptoJS from 'crypto-js';

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

  it('should convert hex to base64 as before', async () => {
    const message = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
    const result = uint8ArrayToBase64(hex2oldEncoding(message));
    const oldResult = CryptoJS.enc.Hex.parse(message).toString(CryptoJS.enc.Base64);
    expect(result).toBe(oldResult);
  });

  it('should convert base64 to hex as before', async () => {
    const message = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
    const key = '123456789QWERTY';
    const bytes = CryptoJS.AES.encrypt(message, key).toString();
    const result = base64ToHex(bytes);
    const oldResult = CryptoJS.enc.Base64.parse(bytes).toString(CryptoJS.enc.Hex);
    expect(result).toBe(oldResult);
  });

  it('should convert to Utf8 as before', async () => {
    const message = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
    const key = '123456789QWERTY';
    const ciphertext = oldEncryptTextWithKey(message, key);
    const reb = uint8ArrayToBase64(hex2oldEncoding(ciphertext));
    const bytes = CryptoJS.AES.decrypt(reb, key);
    const result = wordArrayToUtf8String(bytes);
    const oldResult = bytes.toString(CryptoJS.enc.Utf8);
    expect(result).toBe(oldResult);
  });

  it('should derive the same key and salt as before', async () => {
    const message = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
    const pwd = '123456789QWERTY';

    const enc = CryptoJS.AES.encrypt(message, pwd);

    const kdf = CryptoJS.algo.EvpKDF.create({ keySize: 12 });
    const bytes = kdf.compute(pwd, enc.salt);
    const key = CryptoJS.lib.WordArray.create(bytes.words.slice(0, 12), 8 * 4);
    const iv = CryptoJS.lib.WordArray.create(bytes.words.slice(8, 12), 4 * 4);
    const oldKey = enc.key;
    const oldIv = enc.iv;

    expect(key.words).toEqual(oldKey.words);
    expect(key.sigBytes).toEqual(oldKey.sigBytes);
    expect(iv.words).toEqual(oldIv.words);
    expect(iv.sigBytes).toEqual(oldIv.sigBytes);
    expect(key.toString(CryptoJS.enc.Hex)).toBe(oldKey.toString(CryptoJS.enc.Hex));
    expect(iv.toString(CryptoJS.enc.Hex)).toBe(oldIv.toString(CryptoJS.enc.Hex));
  });

  it('should encrypt as before', async () => {
    const message = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
    const pwd = '123456789QWERTY';
    const enc = CryptoJS.AES.encrypt(message, pwd);
    const kdf = CryptoJS.algo.EvpKDF.create({ keySize: 12 });
    const bytes = kdf.compute(pwd, enc.salt);
    const key = CryptoJS.lib.WordArray.create(bytes.words.slice(0, 12), 8 * 4);
    const iv = CryptoJS.lib.WordArray.create(bytes.words.slice(8, 12), 4 * 4);
    const enc2 = CryptoJS.AES.encrypt(message, key, {
      iv: iv,
    });

    expect(enc.toString(CryptoJS.enc.Hex)).toBe(enc2.toString(CryptoJS.enc.Hex));
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
