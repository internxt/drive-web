import CryptoJS from 'crypto-js';
import { DriveItemData } from '../../drive/types';
import { aes, items as itemUtils } from '@internxt/lib';
import { getAesInitFromEnv } from '../services/keys.service';

interface PassObjectInterface {
  salt?: string | null;
  password: string;
}

// Method to hash password. If salt is passed, use it, in other case use crypto lib for generate salt
function passToHash(passObject: PassObjectInterface): { salt: string; hash: string } {
  const salt = passObject.salt ? CryptoJS.enc.Hex.parse(passObject.salt) : CryptoJS.lib.WordArray.random(128 / 8);
  const hash = CryptoJS.PBKDF2(passObject.password, salt, { keySize: 256 / 32, iterations: 10000 });
  const hashedObjetc = {
    salt: salt.toString(),
    hash: hash.toString(),
  };

  return hashedObjetc;
}

// AES Plain text encryption method
function encryptText(textToEncrypt: string): string {
  return encryptTextWithKey(textToEncrypt, process.env.REACT_APP_CRYPTO_SECRET);
}

// AES Plain text decryption method
function decryptText(encryptedText: string): string {
  return decryptTextWithKey(encryptedText, process.env.REACT_APP_CRYPTO_SECRET);
}

// AES Plain text encryption method with enc. key
function encryptTextWithKey(textToEncrypt: string, keyToEncrypt: string): string {
  const bytes = CryptoJS.AES.encrypt(textToEncrypt, keyToEncrypt).toString();
  const text64 = CryptoJS.enc.Base64.parse(bytes);

  return text64.toString(CryptoJS.enc.Hex);
}

// AES Plain text decryption method with enc. key
function decryptTextWithKey(encryptedText: string, keyToDecrypt: string): string {
  if (!keyToDecrypt) {
    throw new Error('No key defined. Check .env file');
  }

  const reb = CryptoJS.enc.Hex.parse(encryptedText);
  const bytes = CryptoJS.AES.decrypt(reb.toString(CryptoJS.enc.Base64), keyToDecrypt);

  return bytes.toString(CryptoJS.enc.Utf8);
}

function encryptFilename(filename: string, folderId: number): string {
  const { REACT_APP_CRYPTO_SECRET2: CRYPTO_KEY } = process.env;

  if (!CRYPTO_KEY) {
    throw new Error('Cannot encrypt filename due to missing encryption key');
  }

  return aes.encrypt(filename, `${CRYPTO_KEY}-${folderId}`, getAesInitFromEnv());
}

function excludeHiddenItems(items: DriveItemData[]): DriveItemData[] {
  return items.filter((item) => !itemUtils.isHiddenItem(item));
}

function renameFile(file: File, newName: string): File {
  return new File([file], newName);
}

export {
  passToHash,
  encryptText,
  decryptText,
  encryptFilename,
  encryptTextWithKey,
  decryptTextWithKey,
  excludeHiddenItems,
  renameFile,
};
