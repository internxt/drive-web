import {
  encryptSymmetrically,
  deriveSymmetricCryptoKey,
  decryptSymmetrically,
  importSymmetricCryptoKey,
} from 'internxt-crypto/symmetric-crypto';
import { getKeyFromPasswordAndSalt, getKeyFromPassword } from 'internxt-crypto/derive-key';
import {
  UTF8ToUint8,
  base64ToUint8Array,
  uint8ArrayToBase64,
  genMnemonic,
  mnemonicToBytes,
  bytesToMnemonic,
  uint8ToUTF8,
} from 'internxt-crypto/utils';
import { UserKeys } from '@internxt/sdk';
import { generateNewKeys } from 'app/crypto/services/pgp.service';
import { ECC_KEY_AUX, KYBER_KEY_AUX, MNEMONIC_AUX, SESSION_KEY_AUX } from './auth.constants';

export async function encryptUserKeysAndMnemonic(
  userKeys: UserKeys,
  mnemonic: string,
  exportKey: string,
): Promise<{ encMnemonic: string; encKeys: UserKeys }> {
  const exportKeyBytes = safeBase64ToBytes(exportKey);
  const cryptoKey = await deriveSymmetricCryptoKey(exportKeyBytes);
  const key = UTF8ToUint8(userKeys.ecc.privateKey);
  const encPrivateKey = await encryptSymmetrically(cryptoKey, key, UTF8ToUint8(ECC_KEY_AUX));
  const keyKyber = base64ToUint8Array(userKeys.kyber.privateKey);
  const encPrivateKyberKey = await encryptSymmetrically(cryptoKey, keyKyber, UTF8ToUint8(KYBER_KEY_AUX));
  const mnemonicArray = mnemonicToBytes(mnemonic);
  const mnemonicCipher = await encryptSymmetrically(cryptoKey, mnemonicArray, UTF8ToUint8(MNEMONIC_AUX));
  const encMnemonic = uint8ArrayToBase64(mnemonicCipher);

  const encKeys: UserKeys = {
    ecc: {
      privateKey: uint8ArrayToBase64(encPrivateKey),
      publicKey: userKeys.ecc.publicKey,
    },
    kyber: {
      privateKey: uint8ArrayToBase64(encPrivateKyberKey),
      publicKey: userKeys.kyber.publicKey,
    },
  };
  return { encMnemonic, encKeys };
}

export async function decryptUserKeysAndMnemonic(
  encMnemonic: string,
  encKeys: UserKeys,
  exportKey: string,
): Promise<{ keys: UserKeys; mnemonic: string }> {
  const exportKeyBytes = safeBase64ToBytes(exportKey);
  const cryptoKey = await deriveSymmetricCryptoKey(exportKeyBytes);
  const encKey = base64ToUint8Array(encKeys.ecc.privateKey);
  const privateKey = await decryptSymmetrically(cryptoKey, encKey, UTF8ToUint8(ECC_KEY_AUX));
  const encKyberKey = base64ToUint8Array(encKeys.kyber.privateKey);
  const privateKyberKey = await decryptSymmetrically(cryptoKey, encKyberKey, UTF8ToUint8(KYBER_KEY_AUX));
  const encMnemonicArray = base64ToUint8Array(encMnemonic);
  const mnemonicArray = await decryptSymmetrically(cryptoKey, encMnemonicArray, UTF8ToUint8(MNEMONIC_AUX));
  const mnemonic = bytesToMnemonic(mnemonicArray);

  const keys: UserKeys = {
    ecc: {
      privateKey: uint8ToUTF8(privateKey),
      publicKey: encKeys.ecc.publicKey,
    },
    kyber: {
      privateKey: uint8ArrayToBase64(privateKyberKey),
      publicKey: encKeys.kyber.publicKey,
    },
  };
  return { keys, mnemonic };
}

export const encryptSessionKey = async (
  password: string,
  sessionKey: string,
): Promise<{ sessionKeyEnc: string; salt: string }> => {
  const { key, salt } = await getKeyFromPassword(password);
  const cryptoKey = await importSymmetricCryptoKey(key);
  const sessionKeyArray = safeBase64ToBytes(sessionKey);
  const sessionKeyEncCipher = await encryptSymmetrically(cryptoKey, sessionKeyArray, UTF8ToUint8(SESSION_KEY_AUX));
  const sessionKeyEnc = uint8ArrayToBase64(sessionKeyEncCipher);
  return { sessionKeyEnc, salt: uint8ArrayToBase64(salt) };
};

export const safeBase64ToBytes = (urlSafeBase64: string): Uint8Array => {
  const base64 = urlSafeBase64.replaceAll('-', '+').replaceAll('_', '/');
  const padding = (4 - (base64.length % 4)) % 4;
  return base64ToUint8Array(base64 + '='.repeat(padding));
};

export const decryptSessionKey = async (password: string, sessionKeyEnc: string, salt: string): Promise<Uint8Array> => {
  const keyBytes = await getKeyFromPasswordAndSalt(password, base64ToUint8Array(salt));
  const key = await importSymmetricCryptoKey(keyBytes);
  const sessionKeyCipher = base64ToUint8Array(sessionKeyEnc);
  const sessionKeyArray = await decryptSymmetrically(key, sessionKeyCipher, UTF8ToUint8(SESSION_KEY_AUX));
  return sessionKeyArray;
};

export const generateUserSecrets = async (): Promise<{ keys: UserKeys; mnemonic: string }> => {
  const mnemonic = genMnemonic(256);

  const { privateKeyArmored, publicKeyArmored, publicKyberKeyBase64, privateKyberKeyBase64 } = await generateNewKeys();
  const keys: UserKeys = {
    ecc: { privateKey: privateKeyArmored, publicKey: publicKeyArmored },
    kyber: {
      privateKey: privateKyberKeyBase64,
      publicKey: publicKyberKeyBase64,
    },
  };
  return { keys, mnemonic };
};
