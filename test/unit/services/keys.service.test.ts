/**
 * @jest-environment node
 */

import { isValid } from '../../../src/app/crypto/services/utilspgp';
import { generateNewKeys } from '../../../src/app/crypto/services/pgp.service';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@dashlane/pqc-kem-kyber512-browser', () => ({
  default: vi.fn().mockResolvedValue({
    keypair: vi.fn().mockResolvedValue({
      publicKey: new Uint8Array(32),
      privateKey: new Uint8Array(32),
    }),
    encapsulate: vi.fn().mockResolvedValue({
      ciphertext: new Uint8Array(32),
      sharedSecret: new Uint8Array(32),
    }),
    decapsulate: vi.fn().mockResolvedValue({
      sharedSecret: new Uint8Array(32),
    }),
  }),
}));

describe('# keys service tests', () => {
  it('Should generate a valid private key', async () => {
    const keys = await generateNewKeys();

    const plainPrivateKey = keys.privateKeyArmored;

    const isKeyValid = await isValid(plainPrivateKey);
    expect(isKeyValid).toBeTruthy();
  });
});
