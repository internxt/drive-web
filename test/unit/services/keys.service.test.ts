/**
 * @jest-environment jsdom
 */

import { describe, expect, it } from 'vitest';
import { isValid } from '../../../src/app/crypto/services/utilspgp';
import { generateNewKeys } from '../../../src/app/crypto/services/pgp.service';
import {
  encryptTextWithPassword,
  decryptTextWithPassword,
  encryptText,
  decryptText,
  passToHash,
} from '../../../src/app/crypto/services/utils';
import { config } from 'dotenv';
import crypto from 'crypto';
config();

describe('# keys service tests', () => {
  it('Should symmetrically encrypt and decrypt key', async () => {
    const keys = await generateNewKeys();
    const plainPrivateKey = keys.privateKeyArmored;

    expect(isValid(plainPrivateKey)).toBeTruthy();
    const password = '1234 qwerty hola';

    const encrypted = encryptTextWithPassword(plainPrivateKey, password);
    const decrypted = decryptTextWithPassword(encrypted, password);
    expect(plainPrivateKey).toStrictEqual(decrypted);

    const encryptedText = encryptText(plainPrivateKey);
    const decryptedText = decryptText(encryptedText);
    expect(plainPrivateKey).toStrictEqual(decryptedText);
  });

  it('Should have the expected ciphertext length', async () => {
    const password = '1234 qwerty hola';

    /**
     * Expected ciphertext length:
     *        N = 64 (salt) + 16 (iv) + X (message) + 16 (auth tag)
     * N in base64:
     *        L = ceil(N/3)*4
     */

    const keys = await generateNewKeys();
    const plainPrivateKey = keys.privateKeyArmored;
    expect(isValid(plainPrivateKey)).toBeTruthy();
    expect(plainPrivateKey.length).toStrictEqual(716);
    const encryptedPrivateKey = encryptTextWithPassword(plainPrivateKey, password);
    expect(encryptedPrivateKey.length).toStrictEqual(1084);

    const mnemonic =
      'sponsor atom gun uncle ugly museum truth they opinion thunder front apart involve trim pair stove truck omit tornado abstract trip ignore include symptom';
    const encryptedMnemonic = encryptTextWithPassword(mnemonic, password);
    expect(encryptedMnemonic.length).toStrictEqual(332);

    const code = crypto.randomBytes(32).toString('hex');
    const encryptedCode = encryptTextWithPassword(code, mnemonic);
    expect(encryptedCode.length).toStrictEqual(216);

    const hashObj = await passToHash({ password });
    const encryptedHash = encryptText(hashObj.hash);
    expect(encryptedHash.length).toStrictEqual(216);

    const encryptedSalt = encryptText(hashObj.salt);
    expect(encryptedSalt.length).toStrictEqual(172);
  });

  it('Should fail with incorrect password', async () => {
    const keys = await generateNewKeys();
    const plainPrivateKey = keys.privateKeyArmored;

    expect(isValid(plainPrivateKey)).toBeTruthy();

    const password = '1234';
    const incorrectPassword = '12345';

    const encrypted = encryptTextWithPassword(plainPrivateKey, password);

    expect(() => decryptTextWithPassword(encrypted, incorrectPassword)).toThrow('Decryption failed');
  });

  it('Should fail if no password', async () => {
    const keys = await generateNewKeys();
    const emptyPassword = '';

    const plainPrivateKey = keys.privateKeyArmored;
    expect(isValid(plainPrivateKey)).toBeTruthy();

    expect(() => encryptTextWithPassword(plainPrivateKey, emptyPassword)).toThrow('No password given');

    const password = '1234';
    const encrypted = encryptTextWithPassword(plainPrivateKey, password);

    expect(() => decryptTextWithPassword(encrypted, emptyPassword)).toThrow('No password given');
  });

  it('Should fail is ciphertext is altered by even one symbol', async () => {
    const keys = await generateNewKeys();
    const plainPrivateKey = keys.privateKeyArmored;

    expect(isValid(plainPrivateKey)).toBeTruthy();
    const password = '1234 qwerty hola';

    const encrypted = encryptTextWithPassword(plainPrivateKey, password);

    const chr = String.fromCharCode(encrypted.charCodeAt(3) + 1);
    const alteredEncrypted = encrypted.substring(0, 3) + chr + encrypted.substring(4);

    expect(() => decryptTextWithPassword(alteredEncrypted, password)).toThrow('Decryption failed');
  });
});
