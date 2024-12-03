/**
 * @jest-environment jsdom
 */

import { generateNewKeys } from '../../../src/app/crypto/services/pgp.service';
import { isValid } from '../../../src/app/crypto/services/utilspgp';

import { describe, expect, it } from 'vitest';

describe('# keys service tests', () => {
  it('Should not update private key if encryption & encoding is fine', async () => {
    const keys = await generateNewKeys();
    const plainPrivateKey = keys.privateKeyArmored;

    expect(isValid(plainPrivateKey)).toBeTruthy();
  });
});
