import { symmetric, utils, deriveKey } from 'internxt-crypto';
import { UserKeys } from '@internxt/sdk';
import { generateNewKeys } from 'app/crypto/services/pgp.service';
import { ECC_KEY_AUX, KYBER_KEY_AUX, MNEMONIC_AUX } from './auth.constants';

export async function encryptUserKeysAndMnemonic(
  userKeys: UserKeys,
  mnemonic: string,
  exportKey: string,
): Promise<{ encMnemonic: string; encKeys: UserKeys }> {
  const cryptoKey = await symmetric.deriveSymmetricCryptoKey(exportKey);
  const key = utils.UTF8ToUint8(userKeys.ecc.privateKey);
  const encPrivateKey = await symmetric.encryptSymmetrically(cryptoKey, key, ECC_KEY_AUX);
  const keyKyber = utils.base64ToUint8Array(userKeys.kyber.privateKey);
  const encPrivateKyberKey = await symmetric.encryptSymmetrically(cryptoKey, keyKyber, KYBER_KEY_AUX);
  const mnemonicArray = utils.UTF8ToUint8(mnemonic);
  const mnemonicCipher = await symmetric.encryptSymmetrically(cryptoKey, mnemonicArray, MNEMONIC_AUX);
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
  exportKey: string,
): Promise<{ keys: UserKeys; mnemonic: string }> {
  const cryptoKey = await symmetric.deriveSymmetricCryptoKey(exportKey);
  const encKey = utils.base64ToCiphertext(encKeys.ecc.privateKey);
  const privateKey = await symmetric.decryptSymmetrically(cryptoKey, encKey, ECC_KEY_AUX);
  const encKyberKey = utils.base64ToCiphertext(encKeys.kyber.privateKey);
  const privateKyberKey = await symmetric.decryptSymmetrically(cryptoKey, encKyberKey, KYBER_KEY_AUX);
  const encMnemonicArray = utils.base64ToCiphertext(encMnemonic);
  const mnemonicArray = await symmetric.decryptSymmetrically(cryptoKey, encMnemonicArray, MNEMONIC_AUX);
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
  const urlSafeSessionKey = sessionKey.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
  return urlSafeSessionKey;
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
