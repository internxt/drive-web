import CryptoJS from 'crypto-js';
import { DriveItemData } from '../../drive/types';
import { aes, items as itemUtils } from '@internxt/lib';
import { AdvancedSharedItem } from '../../share/types';
import { createSHA512, createHMAC, sha256, createSHA256, sha512, ripemd160 } from 'hash-wasm';
import { Buffer } from 'buffer';
import crypto from 'crypto';

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

/**
 * AES plain text encryption
 * @param {string} textToEncrypt - The plain text
 * @returns {string} The ciphertext
 */
function encryptText(textToEncrypt: string): string {
  return encryptTextWithKey(textToEncrypt, process.env.REACT_APP_CRYPTO_SECRET);
}

/**
 * AES plain text decryption
 * @param {string} encryptedText - The ciphertext
 * @returns {string} The plain text
 */
function decryptText(encryptedText: string): string {
  return decryptTextWithKey(encryptedText, process.env.REACT_APP_CRYPTO_SECRET);
}

/**
 * AES plain text encryption with the given password (identical to what CryptoJS does)
 * @param {string} textToEncrypt - The plain text
 * @param {string} keyToEncrypt - The password
 * @returns {string} The ciphertext
 */
function encryptTextWithKey(textToEncrypt: string, keyToEncrypt: string): string {
  const salt = crypto.randomBytes(8);
  const password = Buffer.concat([Buffer.from(keyToEncrypt, 'binary'), salt]);
  const hash: Buffer[] = [];
  let digest = password;
  for (let i = 0; i < 3; i++) {
    hash[i] = crypto.createHash('md5').update(digest).digest();
    digest = Buffer.concat([hash[i], password]);
  }
  const keyDerivation = Buffer.concat(hash);
  const key = keyDerivation.subarray(0, 32);
  const iv = keyDerivation.subarray(32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const result = Buffer.concat([
    Buffer.from('Salted__', 'utf8'),
    salt,
    cipher.update(textToEncrypt),
    cipher.final(),
  ]).toString('hex');

  return result;
}

/**
 * AES plain text decryption with the given password (identical to what CryptoJS does)
 * @param {string} encryptedText - The ciphertext
 * @param {string} keyToEncrypt - The password
 * @returns {string} The plain text
 */
function decryptTextWithKey(encryptedText: string, keyToDecrypt: string): string {
  if (!keyToDecrypt) {
    throw new Error('No key defined. Check .env file');
  }

  const cypher = Buffer.from(encryptedText, 'hex');

  const salt = cypher.subarray(8, 16);
  const password = Buffer.concat([Buffer.from(keyToDecrypt, 'binary'), salt]);
  const md5Hashes: Buffer[] = [];
  let digest = password;
  for (let i = 0; i < 3; i++) {
    md5Hashes[i] = crypto.createHash('md5').update(digest).digest();
    digest = Buffer.concat([md5Hashes[i], password]);
  }
  const key = Buffer.concat([md5Hashes[0], md5Hashes[1]]);
  const iv = md5Hashes[2];
  const contents = cypher.subarray(16);
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

  let result = decipher.update(contents);
  result = Buffer.concat([result, decipher.final()]);

  return result.toString('utf8');
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
};
