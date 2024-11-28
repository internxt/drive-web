import CryptoJS from 'crypto-js';
import { DriveItemData } from '../../drive/types';
import { aes, items as itemUtils } from '@internxt/lib';
import { AdvancedSharedItem } from '../../share/types';
import { sha256, createSHA256, ripemd160, sha512, blake3 } from 'hash-wasm';
import { Buffer } from 'buffer';

interface PassObjectInterface {
  salt?: string | null;
  password: string;
}

/**
 * Computes sha256
 * @param {string} data - The input data
 * @returns {Promise<string>} The result of applying sha256 to the data.
 */
function getSha256(data: string): Promise<string> {
  return sha256(data);
}

/**
 * Creates sha256 hasher
 * @returns {Promise<IHasher>} The sha256 hasher
 */
function getSha256Hasher() {
  return createSHA256();
}

/**
 * Computes sha512
 * @param {string} dataHex - The input data in HEX format
 * @returns {Promise<string>} The result of applying sha512 to the data.
 */
function getSha512FromHex(dataHex: string): Promise<string> {
  const data = Buffer.from(dataHex, 'hex');
  return sha512(data);
}

/**
 * Computes ripmd160
 * @param {string} dataHex - The input data in HEX format
 * @returns {Promise<string>} The result of applying ripmd160 to the data.
 */
function getRipemd160FromHex(dataHex: string): Promise<string> {
  const data = Buffer.from(dataHex, 'hex');
  return ripemd160(data);
}

/**
 * Extends the given secret to the required number of bits
 * @param {string} secret - The original secret
 * @param {number} length - The desired bitlength
 * @returns {Promise<string>} The extended secret of the desired bitlength
 */
function extendSecret(secret: Uint8Array, length: number): Promise<string> {
  return blake3(secret, length);
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
  encryptTextWithKey,
  decryptTextWithKey,
  excludeHiddenItems,
  renameFile,
  getItemPlainName,
  getSha256,
  getSha256Hasher,
  getSha512FromHex,
  getRipemd160FromHex,
  extendSecret,
};
