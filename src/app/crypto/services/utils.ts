import { items as itemUtils } from '@internxt/lib';
import envService from 'services/env.service';
import { Buffer } from 'buffer';
import CryptoJS from 'crypto-js';
import { blake3, createHMAC, createSHA256, createSHA512, ripemd160, sha256 } from 'hash-wasm';
import { DriveItemData } from 'app/drive/types';
import { AdvancedSharedItem } from '../../share/types';

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

async function hmacSha512(key: Buffer, data: Buffer): Promise<string> {
  const hmac = await createHMAC(createSHA512(), key);
  return hmac.init().update(data).digest();
}

async function deriveHmacKey(fileKey: Buffer): Promise<Buffer> {
  const keyMaterial = await crypto.subtle.importKey('raw', new Uint8Array(fileKey), 'HKDF', false, ['deriveBits']);
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-512', salt: new Uint8Array(64), info: new TextEncoder().encode('for hmac') },
    keyMaterial,
    512,
  );
  return Buffer.from(derivedBits);
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
  if (item.plainName && item.plainName.length > 0) return item.plainName;
  else return item.name;
};

async function getFileHmacFromShardHashes(fileKey: Buffer, shardHashes: string[]): Promise<string> {
  const hmacKey = await deriveHmacKey(fileKey);
  return hmacSha512(hmacKey, Buffer.from(shardHashes.join(''), 'hex'));
}

export {
  decryptText,
  decryptTextWithKey,
  encryptText,
  encryptTextWithKey,
  excludeHiddenItems,
  extendSecret,
  getItemPlainName,
  getRipemd160FromHex,
  getSha256,
  getSha256Hasher,
  getSha512Combined,
  hmacSha512,
  deriveHmacKey,
  getFileHmacFromShardHashes,
  passToHash,
  renameFile,
};
