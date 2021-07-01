import AesUtils from '../../src/lib/AesUtil';
import { isValid } from '../../src/lib/utilspgp';
import { generateNewKeys } from '../../src/services/pgp.service';
import { validateFormat } from '../../src/services/keys.service';

import { config } from 'dotenv';
config();

describe('# Keys service tests', () => {
    it('Should not update private key if encryption & encoding is fine', async () => {
        const keys = await generateNewKeys();
        const plainPrivateKey = keys.privateKeyArmored;

        expect(isValid(plainPrivateKey)).toBeTruthy();

        const password = '1234';
        const encryptedPrivateKey = AesUtils.encrypt(plainPrivateKey, password);
       
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

        const oldEncryptionPrivateKey = AesUtils.encrypt(plainPrivateKey, password, false, 9999);
        const newEncryptionPrivateKey = AesUtils.encrypt(plainPrivateKey, password);

        const { update, newPrivKey, privkeyDecrypted } = await validateFormat(oldEncryptionPrivateKey, password);

        expect(update).toBeTruthy();
        expect(newPrivKey).toStrictEqual(newEncryptionPrivateKey);
        expect(privkeyDecrypted).toStrictEqual(plainPrivateKey);
    });

    it('Should decode private key from base64 & reencrypt with 2145 hops (using 2145 hops)', async () => {
        const keys = await generateNewKeys();
        const password = '1234';

        const plainPrivateKey = keys.privateKeyArmored;
        const encryptedPrivateKeyUtf8 = AesUtils.encrypt(plainPrivateKey, password);

        const base64PrivateKey = Buffer.from(plainPrivateKey).toString('base64');
        const encryptedPrivateKeyBase64 = AesUtils.encrypt(base64PrivateKey, password);
        
        const { update, newPrivKey, privkeyDecrypted } = await validateFormat(encryptedPrivateKeyBase64, password);

        expect(update).toBeTruthy();
        expect(newPrivKey).toStrictEqual(encryptedPrivateKeyUtf8);
        expect(privkeyDecrypted).toStrictEqual(plainPrivateKey);
    });

    it('Should decode private key from base64 & reencrypt with 2145 hops (using 9999 hops)', async () => {
        const keys = await generateNewKeys();
        const password = '1234';

        const plainPrivateKey = keys.privateKeyArmored;
        const encryptedPrivateKeyUtf8 = AesUtils.encrypt(plainPrivateKey, password);

        const base64PrivateKey = Buffer.from(plainPrivateKey).toString('base64');
        const encryptedPrivateKeyBase64 = AesUtils.encrypt(base64PrivateKey, password, false, 9999);
        const { update, newPrivKey, privkeyDecrypted } = await validateFormat(encryptedPrivateKeyBase64, password);

        expect(update).toBeTruthy();
        expect(newPrivKey).toStrictEqual(encryptedPrivateKeyUtf8);
        expect(privkeyDecrypted).toStrictEqual(plainPrivateKey);
    });
});