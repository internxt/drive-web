/**
 * @jest-environment jsdom
 */

import { generateNewKeys } from '../../../src/app/crypto/services/pgp.service';
import {
  getKeys,
  decryptPrivateKey,
  parseAndDecryptUserKeys,
  getAesInitFromEnv,
} from '../../../src/app/crypto/services/keys.service';
import { isValid } from '../../../src/app/crypto/services/utilspgp';
import { aes } from '@internxt/lib';
import { describe, expect, it, afterAll, beforeAll } from 'vitest';
import { Buffer } from 'buffer';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { envConfig } from '../../../src/app/core/services/env.service';

describe('Test keys', () => {
  globalThis.Buffer = Buffer;

  const testSalt =
    '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
  const testIV = '12345678912345678912345678912345';
  const originalIV = envConfig.crypto.magicIv;
  const originalSalt = envConfig.crypto.magicSalt;

  beforeAll(() => {
    envConfig.crypto.magicIv = testIV;
    envConfig.crypto.magicSalt = testSalt;
  });
  afterAll(() => {
    envConfig.crypto.magicIv = originalIV;
    envConfig.crypto.magicSalt = originalSalt;
  });

  it('aes encrypt and decrypt should work', async () => {
    const password = 'test pwd';
    const key = 'test key';
    const iv = getAesInitFromEnv();
    const expectedIv = { iv: testIV, salt: testSalt };
    const encrypted = aes.encrypt(key, password, getAesInitFromEnv());
    const result = aes.decrypt(encrypted, password);
    expect(result).toBe(key);
    expect(iv).toStrictEqual(expectedIv);
  });

  it('should generate new keys', async () => {
    const password = 'test pwd';
    const keys = await getKeys(password);

    expect(keys).toHaveProperty('privateKeyEncrypted');
    expect(keys).toHaveProperty('publicKey');
    expect(keys).toHaveProperty('revocationCertificate');
    expect(keys).toHaveProperty('ecc');
    expect(keys).toHaveProperty('ecc.privateKeyEncrypted');
    expect(keys).toHaveProperty('ecc.publicKey');
    expect(keys).toHaveProperty('kyber');
    expect(keys).toHaveProperty('kyber.privateKeyEncrypted');
    expect(keys).toHaveProperty('kyber.publicKey');
  });

  it('Should not decrypt null, empty, undefined or short private key', async () => {
    const password = 'pwd';

    const emptyResult = decryptPrivateKey('', password);
    expect(emptyResult).toBe('');

    const nullKey = null;
    const nullResult = decryptPrivateKey(nullKey as unknown as string, password);
    expect(nullResult).toBe('');

    const undefinedResult = decryptPrivateKey(undefined as unknown as string, password);
    expect(undefinedResult).toBe('');

    const shortKey = 'MISSING_KEY';
    const shortResult = decryptPrivateKey(shortKey, password);
    expect(shortResult).toBe('');

    const shortKey2 = 'a'.repeat(129);
    const shortResult2 = decryptPrivateKey(shortKey2, password);
    expect(shortResult2).toBe('');

    const randomKey = 'a'.repeat(130);
    expect(() => decryptPrivateKey(randomKey, password)).toThrowError('Key is corrupted');
  });

  it('should correctly decrypt private keys with kyber', async () => {
    const password = 'test pwd';
    const keys = await getKeys(password);

    const user: Partial<UserSettings> = {
      publicKey: keys.ecc.publicKey,
      privateKey: keys.ecc.privateKeyEncrypted,
      revocationKey: keys.revocationCertificate,
      keys: {
        ecc: {
          publicKey: keys.ecc.publicKey,
          privateKey: keys.ecc.privateKeyEncrypted,
        },
        kyber: {
          publicKey: keys.kyber.publicKey ?? '',
          privateKey: keys.kyber.privateKeyEncrypted ?? '',
        },
      },
    };
    const decryptedKeys = parseAndDecryptUserKeys(user as UserSettings, password);
    const privateKey = aes.decrypt(keys.ecc.privateKeyEncrypted, password);
    const privateKyberKey = keys.kyber.privateKeyEncrypted ? aes.decrypt(keys.kyber.privateKeyEncrypted, password) : '';

    expect(decryptedKeys.publicKey).toBe(keys.ecc.publicKey);
    expect(decryptedKeys.publicKyberKey).toBe(keys.kyber.publicKey);
    expect(decryptedKeys.privateKey).toBe(privateKey);
    expect(decryptedKeys.privateKyberKey).toBe(privateKyberKey);
  });

  it('should correctly decrypt private keys without kyber', async () => {
    const password = 'test pwd';
    const keys = await getKeys(password);

    const user: Partial<UserSettings> = {
      publicKey: keys.ecc.publicKey,
      privateKey: keys.ecc.privateKeyEncrypted,
      revocationKey: keys.revocationCertificate,
    };
    const decryptedKeys = parseAndDecryptUserKeys(user as UserSettings, password);
    const privateKey = aes.decrypt(keys.ecc.privateKeyEncrypted, password);

    expect(decryptedKeys.publicKey).toBe(keys.ecc.publicKey);
    expect(decryptedKeys.publicKyberKey).toBe('');
    expect(decryptedKeys.privateKey).toBe(privateKey);
    expect(decryptedKeys.privateKyberKey).toBe('');
  });

  it('should return empty strings when no keys', async () => {
    const password = 'test pwd';
    const user: Partial<UserSettings> = {};
    const decryptedKeys = parseAndDecryptUserKeys(user as UserSettings, password);

    expect(decryptedKeys.publicKey).toBe('');
    expect(decryptedKeys.publicKyberKey).toBe('');
    expect(decryptedKeys.privateKey).toBe('');
    expect(decryptedKeys.privateKyberKey).toBe('');
  });
});

describe('# keys service tests', () => {
  it('Should not update private key if encryption & encoding is fine', async () => {
    const keys = await generateNewKeys();
    const plainPrivateKey = keys.privateKeyArmored;

    expect(isValid(plainPrivateKey)).toBeTruthy();
  });
});
