import CryptoJS from 'crypto-js';
import { DriveItemData } from '../../drive/types';
import { aes, items as itemUtils } from '@internxt/lib';
import { AdvancedSharedItem } from '../../share/types';
import { createSHA512, createHMAC, sha256, sha512, ripemd160 } from 'hash-wasm';
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
import { argon2id, pbkdf2, createSHA256 } from 'hash-wasm';
import crypto from 'crypto';

const ARGON2ID_PARALLELISM = 4;
const ARGON2ID_ITERATIONS = 2;
const ARGON2ID_MEMORY = 65536;
const ARGON2ID_TAG_LEN = 32;
const ARGON2ID_SALT_LEN = 16;

const PBKDF2_ITERATIONS = 10000;
const PBKDF2_TAG_LEN = 32;

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
 * Computes PBKDF2 and outputs the result in HEX format
 * @param {string} password - The password
 * @param {number} salt - The salt
 * @param {number}[iterations=PBKDF2_ITERATIONS] - The number of iterations to perform
 * @param {number} [hashLength=PBKDF2_TAG_LEN] - The desired output length
 * @returns {Promise<string>} The result of PBKDF2 in HEX format
 */
function getPBKDF2(
  password: string,
  salt: string | Uint8Array,
  iterations = PBKDF2_ITERATIONS,
  hashLength = PBKDF2_TAG_LEN,
): Promise<string> {
  return pbkdf2({
    password,
    salt,
    iterations,
    hashLength,
    hashFunction: createSHA256(),
    outputType: 'hex',
  });
}

/**
 * Computes Argon2 and outputs the result in HEX format
 * @param {string} password - The password
 * @param {number} salt - The salt
 * @param {number} [parallelism=ARGON2ID_PARALLELISM] - The parallelism degree
 * @param {number}[iterations=ARGON2ID_ITERATIONS] - The number of iterations to perform
 * @param {number}[memorySize=ARGON2ID_MEMORY] - The number of KB of memeory to use
 * @param {number} [hashLength=ARGON2ID_TAG_LEN] - The desired output length
 * @param {'hex'|'binary'|'encoded'} [outputType="encoded"] - The output type
 * @returns {Promise<string>} The result of Argon2
 */
function getArgon2(
  password: string,
  salt: string,
  parallelism: number = ARGON2ID_PARALLELISM,
  iterations: number = ARGON2ID_ITERATIONS,
  memorySize: number = ARGON2ID_MEMORY,
  hashLength: number = ARGON2ID_TAG_LEN,
  outputType: 'hex' | 'binary' | 'encoded' = 'encoded',
): Promise<string> {
  return argon2id({
    password,
    salt,
    parallelism,
    iterations,
    memorySize,
    hashLength,
    outputType,
  });
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
/**
 * Password hash computation. If no salt or salt starts with 'argon2id$'  - uses Argon2, else - PBKDF2
 * @param {PassObjectInterface} passObject - The input object containing password and salt (optional)
 * @returns {Promise<{salt: string; hash: string }>} The resulting hash and salt
 */
async function passToHash(passObject: PassObjectInterface): Promise<{ salt: string; hash: string }> {
  let salt;
  let hash;

  if (!passObject.salt) {
    const argonSalt = crypto.randomBytes(ARGON2ID_SALT_LEN).toString('hex');
    hash = await getArgon2(passObject.password, argonSalt);
    salt = 'argon2id$' + argonSalt;
  } else if (passObject.salt.startsWith('argon2id$')) {
    const argonSalt = passObject.salt.replace('argon2id$', '');
    hash = await getArgon2(passObject.password, argonSalt);
    salt = passObject.salt;
  } else {
    salt = passObject.salt;
    const encoded = hex2oldEncoding(salt);
    hash = await getPBKDF2(passObject.password, encoded);
  }
  return { salt, hash };
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
  getHmacSha512FromHexKey,
  getHmacSha512,
  getSha256,
  getSha256Hasher,
  getSha512FromHex,
  getRipemd160FromHex,
  getArgon2,
  getPBKDF2,
  hex2oldEncoding,
};
