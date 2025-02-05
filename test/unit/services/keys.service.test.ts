/**
 * @jest-environment jsdom
 */

import { generateNewKeys } from '../../../src/app/crypto/services/pgp.service';
import { getKeys, decryptPrivateKey, parseAndDecryptUserKeys } from '../../../src/app/crypto/services/keys.service';
import { isValid } from '../../../src/app/crypto/services/utilspgp';
import { aes } from '@internxt/lib';
import { describe, expect, it, afterAll, beforeAll } from 'vitest';
import { Buffer } from 'buffer';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

describe('Generate keys', () => {
  globalThis.Buffer = Buffer;

  const originalIV = process.env.REACT_APP_MAGIC_IV;
  const originalSalt = process.env.REACT_APP_MAGIC_SALT;

  beforeAll(() => {
    process.env.REACT_APP_MAGIC_SALT =
      '00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
    process.env.REACT_APP_MAGIC_IV = '12345678912345678912345678912345';
  });
  afterAll(() => {
    process.env.REACT_APP_MAGIC_IV = originalIV;
    process.env.REACT_APP_MAGIC_SALT = originalSalt;
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

  it('Should not decrypt null, empry, underfined or short private key', async () => {
    const password = 'pwd';

    const emptyResult = decryptPrivateKey('', password);
    expect(emptyResult).toBe('');

    const nullKey = null;
    const nullResult = decryptPrivateKey(nullKey as unknown as string, password);
    expect(nullResult).toBe('');

    const underfinedResult = decryptPrivateKey(undefined as unknown as string, password);
    expect(underfinedResult).toBe('');

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
