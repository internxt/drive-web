/**
 * @jest-environment jsdom
 */

import { generateNewKeys } from '../../../src/app/crypto/services/pgp.service';
import { getKeys } from '../../../src/app/crypto/services/keys.service';
import { isValid } from '../../../src/app/crypto/services/utilspgp';

import { describe, expect, it, afterAll, beforeAll } from 'vitest';
import { Buffer } from 'buffer';

describe('Generate keys', () => {
  globalThis.Buffer = Buffer;
  if (typeof globalThis.process === 'undefined') {
    globalThis.process = { env: {} } as any;
  }
  const originalIV = process.env.REACT_APP_MAGIC_IV;
  const originalSalt = process.env.REACT_APP_MAGIC_SALT;

  beforeAll(() => {
    process.env.REACT_APP_MAGIC_IV = 'test_magic_iv';
    process.env.REACT_APP_MAGIC_SALT = 'test_magic_salt';
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
});

describe('# keys service tests', () => {
  it('Should not update private key if encryption & encoding is fine', async () => {
    const keys = await generateNewKeys();
    const plainPrivateKey = keys.privateKeyArmored;

    expect(isValid(plainPrivateKey)).toBeTruthy();
  });
});
