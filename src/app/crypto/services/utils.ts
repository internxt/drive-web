import { Buffer } from 'buffer';
import { argon2id, blake3, pbkdf2, createSHA256, sha512, sha256, ripemd160, createHMAC, createSHA512 } from 'hash-wasm';
import crypto from 'crypto';

import { DriveItemData } from '../../drive/types';
import { aes, items as itemUtils } from '@internxt/lib';
import { AdvancedSharedItem } from '../../share/types';

const ARGON2ID_PARALLELISM = 1;
const ARGON2ID_ITERATIONS = 256;
const ARGON2ID_MEMORY = 512;
const ARGON2ID_TAG_LEN = 32;
const ARGON2ID_SALT_LEN = 16;

const PBKDF2_ITERATIONS = 10000;
const PBKDF2_TAG_LEN = 32;

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
function getPBKDF2(
  password: string,
  salt: string,
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

// Method to hash password. If salt is passed, use it, in other case use crypto lib for generate salt
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
  } else if (passObject.salt.startsWith('hybrid$')) {
    const params = passObject.salt.split('$');
    const oldhash = await getPBKDF2(passObject.password, params[1]);
    hash = await getArgon2(oldhash, params[2]);
    salt = passObject.salt;
  } else {
    throw Error('Incorrect salt format');
  }
  return { salt, hash };
}

// AES Plain text encryption method
function encryptText(textToEncrypt: string): string {
  return encryptTextWithPassword(textToEncrypt, process.env.REACT_APP_CRYPTO_SECRET);
}

// AES Plain text decryption method
function decryptText(encryptedText: string): string {
  return decryptTextWithPassword(encryptedText, process.env.REACT_APP_CRYPTO_SECRET);
}

// AES Plain text encryption method with enc. key
function encryptTextWithPassword(textToEncrypt: string, password: string): string {
  if (!password) {
    throw new Error('No password given');
  }

  return aes.encrypt(textToEncrypt, password);
}

// AES Plain text decryption method with enc. key
function decryptTextWithPassword(encryptedText: string, keyToDecrypt: string): string {
  if (!keyToDecrypt) {
    throw new Error('No password given');
  }

  try {
    const decrypted = aes.decrypt(encryptedText, keyToDecrypt);
    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed');
  }
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
  encryptText,
  decryptText,
  encryptTextWithPassword,
  decryptTextWithPassword,
  excludeHiddenItems,
  renameFile,
  getItemPlainName,
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
