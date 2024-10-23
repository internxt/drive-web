/**
 * @jest-environment node
 */

import { isValid } from '../../../src/app/crypto/services/utilspgp';
import { generateNewKeys } from '../../../src/app/crypto/services/pgp.service';
import { encryptTextWithPassword, decryptTextWithPassword } from '../../../src/app/crypto/services/utils';

import { config } from 'dotenv';
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
    console.log('before', encrypted.charAt(3));
    console.log('after', chr);
    const alteredEncrypted = encrypted.substring(0, 3) + chr + encrypted.substring(4);

    expect(() => decryptTextWithPassword(alteredEncrypted, password)).toThrow('Decryption failed');
  });
});
