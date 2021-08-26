import { aes } from '@internxt/lib';
import { isValid } from '../../src/lib/utilspgp';
import { generateNewKeys } from '../../src/services/pgp.service';
import { getAesInitFromEnv, validateFormat } from '../../src/services/keys.service';

import { config } from 'dotenv';
config();

describe('# keys service tests', () => {

  const aesInit = getAesInitFromEnv();

  it('Should not update private key if encryption & encoding is fine', async () => {
    const keys = await generateNewKeys();
    const plainPrivateKey = keys.privateKeyArmored;

    expect(isValid(plainPrivateKey)).toBeTruthy();

    const password = '1234';
    const encryptedPrivateKey = aes.encrypt(plainPrivateKey, password, aesInit);

    const { update, newPrivKey, privkeyDecrypted } = await validateFormat(encryptedPrivateKey, password);

    expect(update).toBeFalsy();
    expect(newPrivKey).toBeUndefined();
    expect(privkeyDecrypted).toStrictEqual(plainPrivateKey);
  });

  it('Should reencrypt with 2145 hops', async () => {
    const keys = await generateNewKeys();
    const plainPrivateKey = keys.privateKeyArmored;

    expect(isValid(plainPrivateKey)).toBeTruthy();

    const password = '1234';

    const oldEncryptionPrivateKey = aes.encrypt(plainPrivateKey, password, aesInit, 9999);
    const newEncryptionPrivateKey = aes.encrypt(plainPrivateKey, password, aesInit);

    const { update, newPrivKey, privkeyDecrypted } = await validateFormat(oldEncryptionPrivateKey, password);

    expect(update).toBeTruthy();
    expect(newPrivKey).toStrictEqual(newEncryptionPrivateKey);
    expect(privkeyDecrypted).toStrictEqual(plainPrivateKey);
  });

  it('Should decode private key from base64 & reencrypt with 2145 hops (using 2145 hops)', async () => {
    const keys = await generateNewKeys();
    const password = '1234';

    const plainPrivateKey = keys.privateKeyArmored;
    const encryptedPrivateKeyUtf8 = aes.encrypt(plainPrivateKey, password, aesInit);

    const base64PrivateKey = Buffer.from(plainPrivateKey).toString('base64');
    const encryptedPrivateKeyBase64 = aes.encrypt(base64PrivateKey, password, aesInit);

    const { update, newPrivKey, privkeyDecrypted } = await validateFormat(encryptedPrivateKeyBase64, password);

    expect(update).toBeTruthy();
    expect(newPrivKey).toStrictEqual(encryptedPrivateKeyUtf8);
    expect(privkeyDecrypted).toStrictEqual(plainPrivateKey);
  });

  it('Should decode private key from base64 & reencrypt with 2145 hops (using 9999 hops)', async () => {
    const keys = await generateNewKeys();
    const password = '1234';

    const plainPrivateKey = keys.privateKeyArmored;
    const encryptedPrivateKeyUtf8 = aes.encrypt(plainPrivateKey, password, aesInit);

    const base64PrivateKey = Buffer.from(plainPrivateKey).toString('base64');

    const encryptedPrivateKeyBase64 = aes.encrypt(base64PrivateKey, password, aesInit, 9999);
    const { update, newPrivKey, privkeyDecrypted } = await validateFormat(encryptedPrivateKeyBase64, password);

    expect(update).toBeTruthy();
    expect(newPrivKey).toStrictEqual(encryptedPrivateKeyUtf8);
    expect(privkeyDecrypted).toStrictEqual(plainPrivateKey);
  });
});