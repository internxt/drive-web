import CryptoJS from 'crypto-js';
import { DriveItemData } from '../../drive/types';
import { aes, items as itemUtils } from '@internxt/lib';
import { getAesInitFromEnv } from '../services/keys.service';
import { AdvancedSharedItem } from '../../share/types';
import crypto from 'crypto';

interface PassObjectInterface {
  salt?: string | null;
  password: string;
}

/**
 * Converts HEX string to Uint8Array the same way CryptoJS did it (for compatibility)
 * @param {string} hex - The input string in HEX
 * @returns {Uint8Array} The resulting Uint8Array identical to what CryptoJS previously did
 */
function hex2oldEncoding(hex: string): Uint8Array {
  const words: number[] = [];
  for (let i = 0; i < hex.length; i += 8) {
    words.push(parseInt(hex.slice(i, i + 8), 16) | 0);
  }
  const sigBytes = hex.length / 2;
  const uint8Array = new Uint8Array(sigBytes);

  for (let i = 0; i < sigBytes; i++) {
    uint8Array[i] = (words[i >>> 2] >>> ((3 - (i % 4)) * 8)) & 0xff;
  }

  return uint8Array;
}
function uint8ArrayToBase64(uint8Array) {
  let binaryString = '';
  for (const byte of uint8Array) {
    binaryString += String.fromCharCode(byte);
  }
  return btoa(binaryString);
}

function base64ToHex(base64String) {
  // Decode Base64 to a binary string
  const binaryString = atob(base64String);

  // Convert binary string to Uint8Array
  const length = binaryString.length;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0')) // Convert to hex and pad with leading zero if necessary
    .join(''); // Combine all hex values into a single string
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
  const result = base64ToHex(bytes);
  return result;
}

// AES Plain text decryption method with enc. key
function decryptTextWithKey(encryptedText: string, keyToDecrypt: string): string {
  if (!keyToDecrypt) {
    throw new Error('No key defined. Check .env file');
  }

  const reb = uint8ArrayToBase64(hex2oldEncoding(encryptedText));
  const bytes = CryptoJS.AES.decrypt(reb, keyToDecrypt);

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
  hex2oldEncoding,
  uint8ArrayToBase64,
  base64ToHex,
};
