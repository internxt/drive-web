import { ShardMeta } from '@internxt/inxt-js/build/lib/models';
import {
  Aes256gcmEncrypter,
  sha512HmacBuffer,
  sha512HmacBufferFromHex,
} from '@internxt/inxt-js/build/lib/utils/crypto';
import { mnemonicToSeed } from 'bip39';
import { Cipher, CipherCCM, createCipheriv, createHash } from 'crypto';

const BUCKET_META_MAGIC = [
  66, 150, 71, 16, 50, 114, 88, 160, 163, 35, 154, 65, 162, 213, 226, 215, 70, 138, 57, 61, 52, 19, 210, 170, 38, 164,
  162, 200, 86, 201, 2, 81,
];

export function createAES256Cipher(key: Buffer, iv: Buffer): Cipher {
  return createCipheriv('aes-256-ctr', key, iv);
}

export function generateHMAC(shardMetas: ShardMeta[], encryptionKey: Buffer): Buffer {
  const shardHashesSorted = [...shardMetas].sort((sA, sB) => sA.index - sB.index);
  const hmac = sha512HmacBuffer(encryptionKey);

  for (const shardMeta of shardHashesSorted) {
    hmac.update(Buffer.from(shardMeta.hash, 'hex'));
  }

  return hmac.digest();
}

function getDeterministicKey(key: string, data: string): Buffer {
  const input = key + data;

  return createHash('sha512').update(Buffer.from(input, 'hex')).digest();
}

async function getBucketKey(mnemonic: string, bucketId: string): Promise<string> {
  const seed = (await mnemonicToSeed(mnemonic)).toString('hex');

  return getDeterministicKey(seed, bucketId).toString('hex').slice(0, 64);
}

export function encryptMeta(fileMeta: string, key: Buffer, iv: Buffer): string {
  const cipher: CipherCCM = Aes256gcmEncrypter(key, iv);
  const cipherTextBuf = Buffer.concat([cipher.update(fileMeta, 'utf8'), cipher.final()]);
  const digest = cipher.getAuthTag();

  return Buffer.concat([digest, iv, cipherTextBuf]).toString('base64');
}

export async function encryptFilename(mnemonic: string, bucketId: string, filename: string): Promise<string> {
  const bucketKey = await getBucketKey(mnemonic, bucketId);
  const encryptionKey = sha512HmacBufferFromHex(bucketKey).update(Buffer.from(BUCKET_META_MAGIC)).digest().slice(0, 32);
  const encryptionIv = sha512HmacBufferFromHex(bucketKey).update(bucketId).update(filename).digest().slice(0, 32);

  return encryptMeta(filename, encryptionKey, encryptionIv);
}
