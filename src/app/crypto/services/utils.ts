import CryptoJS from 'crypto-js';
import { Buffer } from 'buffer';
import { argon2id, blake3, pbkdf2, createSHA256, sha512, sha256, ripemd160, createHMAC, createSHA512 } from 'hash-wasm';
import crypto from 'crypto';

import { DriveItemData } from '../../drive/types';
import { aes, items as itemUtils } from '@internxt/lib';
import { getAesInitFromEnv } from '../services/keys.service';
import { AdvancedSharedItem } from '../../share/types';

interface PassObjectInterface {
  salt?: string | null;
  password: string;
}

function getSha256Hasher() {
  return createSHA256();
}

function getSha256(data: string) {
  return sha256(data);
}

function getSha512(data: string) {
  return sha512(data);
}

function getRipemd160(data: string) {
  return ripemd160(data);
}

function getHmacSha512FromHexKey(encryptionKeyHex: string, dataArray: string[] | Buffer[]) {
  const encryptionKey = Buffer.from(encryptionKeyHex, 'hex');
  return getHmacSha512(encryptionKey, dataArray);
}

async function getHmacSha512(encryptionKey: Buffer, dataArray: string[] | Buffer[]) {
  const hashFunc = createSHA512();
  const hmac = await createHMAC(hashFunc, encryptionKey);
  hmac.init();
  for (const data of dataArray) {
    hmac.update(data);
  }
  return hmac.digest();
}

function extendSecret(message: Uint8Array, length: number): Promise<string> {
  return blake3(message, length);
}
function getPBKDF2(password: string, salt: string): Promise<string> {
  return pbkdf2({
    password,
    salt,
    iterations: 10000,
    hashLength: 32,
    hashFunction: createSHA256(),
    outputType: 'hex',
  });
}

function getArgon2(password: string): Promise<string> {
  const argonSalt = crypto.randomBytes(16);
  return argon2id({
    password: password,
    salt: argonSalt,
    parallelism: 1,
    iterations: 2,
    memorySize: 19456,
    hashLength: 32,
    outputType: 'hex',
  });
}

// Method to hash password. If salt is passed, use it, in other case use crypto lib for generate salt
async function passToHash(passObject: PassObjectInterface): Promise<{ salt: string; hash: string }> {
  let salt;
  let hash;

  if (passObject.salt) {
    // if salt =>   argon2id(PBKDF2(pwd))
    salt = CryptoJS.enc.Hex.parse(passObject.salt);
    const oldhash = await getPBKDF2(passObject.password, salt);
    hash = await getArgon2(oldhash);
  } else {
    // if no salt =>  Argon2id
    salt = null;
    hash = await getArgon2(passObject.password);
  }

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

function createAES256Cipher(key: Uint8Array, iv: Uint8Array): crypto.Cipher {
  return crypto.createCipheriv('aes-256-ctr', key, iv);
}

export {
  encryptText,
  decryptText,
  encryptFilename,
  encryptTextWithKey,
  decryptTextWithKey,
  excludeHiddenItems,
  renameFile,
  getItemPlainName,
  createAES256Cipher,
  passToHash,
  extendSecret,
  getArgon2,
  getPBKDF2,
  getSha256Hasher,
  getSha256,
  getSha512,
  getRipemd160,
  getHmacSha512,
  getHmacSha512FromHexKey,
};
