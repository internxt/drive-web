import { aes, items as itemUtils } from '@internxt/lib';
import envService from 'app/core/services/env.service';
import { Buffer } from 'buffer';
import CryptoJS from 'crypto-js';
import { blake3, createHMAC, createSHA256, createSHA512, ripemd160, sha256, sha512 } from 'hash-wasm';
import { DriveItemData } from '../../drive/types';
import { AdvancedSharedItem } from '../../share/types';

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
 * Computes sha512 from combined key and data
 * @param {Buffer} key - The key
 * @param {Buffer } data - The data
 * @returns {Promise<string>} The result of applying sha512 to the combined key and data.
 */
async function getSha512Combined(key: Buffer, data: Buffer): Promise<string> {
  const hash = await createSHA512();
  return hash.init().update(key).update(data).digest();
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
 * Extends the given secret to the required number of bits
 * @param {string} secret - The original secret
 * @param {number} length - The desired bitlength
 * @returns {Promise<string>} The extended secret of the desired bitlength
 */
function extendSecret(secret: Uint8Array, length: number): Promise<string> {
  return blake3(secret, length);
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
  return encryptTextWithKey(textToEncrypt, envService.getVariable('secret'));
}

// AES Plain text decryption method
function decryptText(encryptedText: string): string {
  return decryptTextWithKey(encryptedText, envService.getVariable('secret'));
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
      return aes.decrypt(item.name, `${envService.getVariable('secret2')}-${item.parentId}`);
    } else {
      return aes.decrypt(item.name, `${envService.getVariable('secret2')}-${item.folderId}`);
    }
  } catch {
    //Decrypt has failed because item.name is not encrypted
    return item.name;
  }
};

export {
  decryptText,
  decryptTextWithKey,
  encryptText,
  encryptTextWithKey,
  excludeHiddenItems,
  extendSecret,
  getHmacSha512,
  getHmacSha512FromHexKey,
  getItemPlainName,
  getRipemd160FromHex,
  getSha256,
  getSha256Hasher,
  getSha512Combined,
  getSha512FromHex,
  passToHash,
  renameFile,
};
