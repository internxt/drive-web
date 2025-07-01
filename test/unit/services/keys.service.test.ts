/**
 * @jest-environment jsdom
 */

import { generateNewKeys } from '../../../src/app/crypto/services/pgp.service';
import { getKeys, decryptPrivateKey } from '../../../src/app/crypto/services/keys.service';
import { isValid } from '../../../src/app/crypto/services/utilspgp';

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Buffer } from 'buffer';
import envService from '../../../src/app/core/services/env.service';

const mockMagicIv = 'test_magic_iv';
const mockMagicSalt = 'test_magic_salt';

describe('Generate keys', () => {
  globalThis.Buffer = Buffer;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate new keys', async () => {
    const password = 'test pwd';
    vi.spyOn(envService, 'getVariable').mockImplementation((key) => {
      if (key === 'magicIv') return mockMagicIv;
      if (key === 'magicSalt') return mockMagicSalt;
      else return 'no mock implementation';
    });
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
});

describe('# keys service tests', () => {
  it('Should not update private key if encryption & encoding is fine', async () => {
    const keys = await generateNewKeys();
    const plainPrivateKey = keys.privateKeyArmored;

    expect(isValid(plainPrivateKey)).toBeTruthy();
  });
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
