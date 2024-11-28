import CryptoJS from 'crypto-js';
import { DriveItemData } from '../../drive/types';
import { aes, items as itemUtils } from '@internxt/lib';
import { AdvancedSharedItem } from '../../share/types';
import { createSHA512, createHMAC, sha256, createSHA256, sha512, ripemd160 } from 'hash-wasm';
import { Buffer } from 'buffer';

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

/**
 * Converts Uint8Array to Base64 the same way CryptoJS did it (for compatibility)
 * @param {Uint8Array} uint8Array - The input Uint8Array array
 * @returns {string} The resulting Base64 string identical to what CryptoJS previously did
 */
function uint8ArrayToBase64(uint8Array: Uint8Array) {
  let result = '';
  for (const byte of uint8Array) {
    result += String.fromCharCode(byte);
  }
  return btoa(result);
}

/**
 * Converts Base64 to HEX the same way CryptoJS did it (for compatibility)
 * @param {string} base64String - The input Base64 string
 * @returns {string} The resulting HEX string identical to what CryptoJS previously did
 */
function base64ToHex(base64String: string) {
  const binaryString = atob(base64String);
  const length = binaryString.length;
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0')) // Convert to hex and pad with leading zero if necessary
    .join(''); // Combine all hex values into a single string
}

function wordArrayToUtf8String(wordArray) {
  const byteArray = new Uint8Array(wordArray.sigBytes);
  for (let i = 0; i < wordArray.sigBytes; i++) {
    byteArray[i] = (wordArray.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(byteArray);
}

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
  const salt = CryptoJS.lib.WordArray.random(8);
  const kdf = CryptoJS.algo.EvpKDF.create({ keySize: 12 });
  const derived = kdf.compute(keyToEncrypt, salt);
  const key = CryptoJS.lib.WordArray.create(derived.words.slice(0, 12), 8 * 4);
  const iv = CryptoJS.lib.WordArray.create(derived.words.slice(8, 12), 4 * 4);
  const bytes = CryptoJS.AES.encrypt(textToEncrypt, key, {
    iv: iv,
  });
  const saltedPrefix = CryptoJS.enc.Utf8.parse('Salted__');
  const result = saltedPrefix + salt.toString(CryptoJS.enc.Hex) + base64ToHex(bytes.toString());
  return result;
}

// AES Plain text decryption method with enc. key
function decryptTextWithKey(encryptedText: string, keyToDecrypt: string): string {
  if (!keyToDecrypt) {
    throw new Error('No key defined. Check .env file');
  }

  const reb = uint8ArrayToBase64(hex2oldEncoding(encryptedText));
  const bytes = CryptoJS.AES.decrypt(reb, keyToDecrypt);

  return wordArrayToUtf8String(bytes);
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
  getHmacSha512FromHexKey,
  getHmacSha512,
  getSha256,
  getSha256Hasher,
  getSha512FromHex,
  getRipemd160FromHex,
  hex2oldEncoding,
  uint8ArrayToBase64,
  base64ToHex,
  wordArrayToUtf8String,
};
