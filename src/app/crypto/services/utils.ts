import CryptoJS from 'crypto-js';
import { DriveItemData } from '../../drive/types';
import { aes, items as itemUtils } from '@internxt/lib';
import { getAesInitFromEnv } from '../services/keys.service';
import { AdvancedSharedItem } from '../../share/types';
import { createSHA512, createHMAC } from 'hash-wasm';
import { Buffer } from 'buffer';
/**
 * Computes hmac-sha512
 * @param {string} encryptionKeyHex - The hmac key in HEX format
 * @param {string} dataArray - The input array of data
 * @returns {Promise<string>} The result of applying hmac-sha512 to the array of data.
 */
function getHmacSha512FromHexKey(encryptionKeyHex: string, dataArray: string[] | Buffer[]): Promise<string> {
  const encryptionKey = Buffer.from(encryptionKeyHex, 'hex');
  return getHmacSha512(encryptionKey, dataArray);
}

/**
 * Computes hmac-sha512
 * @param {Buffer} encryptionKey - The hmac key
 * @param {string} dataArray - The input array of data
 * @returns {Promise<string>} The result of applying hmac-sha512 to the array of data.
 */
async function getHmacSha512(encryptionKey: Buffer, dataArray: string[] | Buffer[]): Promise<string> {
  const hashFunc = createSHA512();
  const hmac = await createHMAC(hashFunc, encryptionKey);
  hmac.init();
  for (const data of dataArray) {
    hmac.update(data);
  }
  return hmac.digest();
}

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

const getItemPlainName = (item: DriveItemData | AdvancedSharedItem) => {
  if (item.plainName && item.plainName.length > 0) {
    return item.plainName;
  }
  try {
    if (item.isFolder || item.type === 'folder') {
      return aes.decrypt(item.name, `${process.env.REACT_APP_CRYPTO_SECRET2}-${item.parentId}`);
    } else {
      return aes.decrypt(item.name, `${process.env.REACT_APP_CRYPTO_SECRET2}-${item.folderId}`);
    }
  } catch (err) {
    //Decrypt has failed because item.name is not encrypted
    return item.name;
  }
};

export {
  passToHash,
  encryptText,
  decryptText,
  encryptFilename,
  encryptTextWithKey,
  decryptTextWithKey,
  excludeHiddenItems,
  renameFile,
  getItemPlainName,
  getHmacSha512FromHexKey,
  getHmacSha512,
};
