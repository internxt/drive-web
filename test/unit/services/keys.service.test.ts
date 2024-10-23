/**
 * @jest-environment node
 */
import { isValid } from '../../../src/app/crypto/services/utilspgp';
import { generateNewKeys } from '../../../src/app/crypto/services/pgp.service';
import {
  encryptTextWithPassword,
  decryptTextWithPassword,
  encryptText,
  decryptText,
  passToHash,
} from '../../../src/app/crypto/services/utils';
import { validateMnemonic } from 'bip39';
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

    // when encrypt private key
    const keys = await generateNewKeys();
    const plainPrivateKey = keys.privateKeyArmored;
    expect(isValid(plainPrivateKey)).toBeTruthy();
    expect(plainPrivateKey.length).toStrictEqual(716);
    // PrivateKey: expected length 64 (salt from scrypt) + 16 (iv) + 716 (enc private key) + 16 (tag) = 812
    // 812 in base64  ceil(812/3)*4 = 271*4 = 1084
    const encryptedPrivateKey = encryptTextWithPassword(plainPrivateKey, password);
    expect(encryptedPrivateKey.length).toStrictEqual(1084);

    // when encrypt mnemonic
    const mnemonic =
      'sponsor atom gun uncle ugly museum truth they opinion thunder front apart involve trim pair stove truck omit tornado abstract trip ignore include symptom';
    expect(validateMnemonic(mnemonic)).toBeTruthy();
    const encryptedMnemonic = encryptTextWithPassword(mnemonic, password);
    // Mnemonic: expected length 64 (salt from scrypt) + 16 (iv) + 153 (enc mnemonic) + 16 (tag) = 249
    // 249 in base64  ceil(249/3)*4 = 83*4 = 332
    expect(encryptedMnemonic.length).toStrictEqual(332);

    // when encrypt code
    const code = crypto.randomBytes(32).toString('hex');
    const encryptedCode = encryptTextWithPassword(code, mnemonic);
    // Code: expected length 64 (salt from scrypt) + 16 (iv) + 64 (enc code) + 16 (tag) = 160
    // 160 in base64  ceil(160/3)*4 = 54*4 = 216
    expect(encryptedCode.length).toStrictEqual(216);

    //when encrypt salt and hash
    const hashObj = passToHash({ password });
    const encryptedHash = encryptText(hashObj.hash);
    // Hash: expected length 64 (salt) + 16 (iv) + 64 (enc hash) + 16 (tag) = 160
    // 160 in base64  ceil(160/3)*4 = 54*4 = 216
    expect(encryptedHash.length).toStrictEqual(216);
    const encryptedSalt = encryptText(hashObj.salt);
    // Salt: expected length 64 (salt from scrypt) + 16 (iv) + 32 (enc salt) + 16 (tag) = 128
    // 128 in base64  ceil(128/3)*4 = 43*4 = 172
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
