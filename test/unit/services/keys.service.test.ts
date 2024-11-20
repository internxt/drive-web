/**
 * @jest-environment node
 */

import { isValid } from '../../../src/app/crypto/services/utilspgp';
import { generateNewKeys } from '../../../src/app/crypto/services/pgp.service';

import { config } from 'dotenv';
config();

describe('# keys service tests', () => {
  xit('Should not update private key if encryption & encoding is fine', async () => {
    const keys = await generateNewKeys();
    const plainPrivateKey = keys.privateKeyArmored;

    expect(isValid(plainPrivateKey)).toBeTruthy();
  });
});
