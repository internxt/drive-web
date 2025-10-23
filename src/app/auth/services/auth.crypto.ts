import { symmetric, utils, deriveKey } from 'internxt-crypto';
import { UserKeys } from '@internxt/sdk';
import { balke3MAC } from 'app/crypto/services/utils';

import { generateNewKeys } from 'app/crypto/services/pgp.service';

const USER_DATA_CONTEXT = 'key for protecting user mnemonic';
const SESSION_KEY_CONTENT = 'key for authenticating via mac';

export async function encryptUserKeysAndMnemonic(
  userKeys: UserKeys,
  mnemonic: string,
  exportKey: string,
): Promise<{ encMnemonic: string; encKeys: UserKeys }> {
  const keyArray = await deriveKey.deriveSymmetricKeyFromContext(USER_DATA_CONTEXT, exportKey);
  const cryptoKey = await symmetric.importSymmetricCryptoKey(keyArray);
  const key = utils.UTF8ToUint8(userKeys.ecc.privateKey);
  const encPrivateKey = await symmetric.encryptSymmetrically(cryptoKey, key, 'user-private-key');
  const keyKyber = utils.base64ToUint8Array(userKeys.kyber.privateKey);
  const encPrivateKyberKey = await symmetric.encryptSymmetrically(cryptoKey, keyKyber, 'user-private-kyber-key');
  const mnemonicArray = utils.UTF8ToUint8(mnemonic);
  const mnemonicCipher = await symmetric.encryptSymmetrically(cryptoKey, mnemonicArray, 'user-mnemonic');
  const encMnemonic = utils.ciphertextToBase64(mnemonicCipher);

  const encKeys: UserKeys = {
    ecc: {
      privateKey: utils.ciphertextToBase64(encPrivateKey),
      publicKey: userKeys.ecc.publicKey,
    },
    kyber: {
      privateKey: utils.ciphertextToBase64(encPrivateKyberKey),
      publicKey: userKeys.kyber.publicKey,
    },
  };
  return { encMnemonic, encKeys };
}

export async function decryptUserKeysAndMnemonic(
  encMnemonic: string,
  encKeys: UserKeys,
  key: string,
): Promise<{ keys: UserKeys; mnemonic: string }> {
  const keyArray = await deriveKey.deriveSymmetricKeyFromContext(USER_DATA_CONTEXT, key);
  const cryptoKey = await symmetric.importSymmetricCryptoKey(keyArray);
  const encKey = utils.base64ToCiphertext(encKeys.ecc.privateKey);
  const privateKey = await symmetric.decryptSymmetrically(cryptoKey, encKey, 'user-private-key');
  const encKyberKey = utils.base64ToCiphertext(encKeys.kyber.privateKey);
  const privateKyberKey = await symmetric.decryptSymmetrically(cryptoKey, encKyberKey, 'user-private-kyber-key');
  const encMnemonicArray = utils.base64ToCiphertext(encMnemonic);
  const mnemonicArray = await symmetric.decryptSymmetrically(cryptoKey, encMnemonicArray, 'user-mnemonic');
  const mnemonic = utils.uint8ToUTF8(mnemonicArray);

  const keys: UserKeys = {
    ecc: {
      privateKey: utils.uint8ToUTF8(privateKey),
      publicKey: encKeys.ecc.publicKey,
    },
    kyber: {
      privateKey: utils.uint8ArrayToBase64(privateKyberKey),
      publicKey: encKeys.kyber.publicKey,
    },
  };
  return { keys, mnemonic };
}

export const encryptSessionKey = async (
  password: string,
  sessionKey: string,
): Promise<{ sessionKeyEnc: string; salt: string }> => {
  const { key, salt } = await deriveKey.getKeyFromPassword(password);
  const cryptoKey = await symmetric.importSymmetricCryptoKey(key);
  const sessionKeyArray = utils.base64ToUint8Array(sessionKey);
  const sessionKeyEncCipher = await symmetric.encryptSymmetrically(cryptoKey, sessionKeyArray, 'UserSessionKey');
  const sessionKeyEnc = utils.ciphertextToBase64(sessionKeyEncCipher);
  return { sessionKeyEnc, salt };
};

export const decryptSessionKey = async (password: string, sessionKeyEnc: string, salt: string): Promise<string> => {
  const keyBytes = await deriveKey.getKeyFromPasswordAndSalt(password, salt);
  const key = await symmetric.importSymmetricCryptoKey(keyBytes);
  const sessionKeyCipher = utils.base64ToCiphertext(sessionKeyEnc);
  const sessionKeyArray = await symmetric.decryptSymmetrically(key, sessionKeyCipher, 'UserSessionKey');
  const sessionKey = utils.uint8ArrayToBase64(sessionKeyArray);
  const urlSafeSessionKey = sessionKey.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return urlSafeSessionKey;
};

export const authenticateRequest = async (sessionKey: string, request: string[]): Promise<string> => {
  const key = await deriveKey.deriveSymmetricKeyFromContext(SESSION_KEY_CONTENT, sessionKey);
  return balke3MAC(key, request);
};

export const generateUserSecrets = async (): Promise<{ keys: UserKeys; mnemonic: string }> => {
  const mnemonic = utils.genMnemonic(256);
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
