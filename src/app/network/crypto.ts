import { mnemonicToSeed } from 'bip39';
import * as crypto from 'crypto';
import { Cipher, CipherCCM, createCipheriv } from 'crypto';

import {
  getHmacSha512,
  getHmacSha512FromHexKey,
  getRipemd160FromHex,
  getSha256Hasher,
  getSha512Combined,
  getSha512FromHex,
} from '../crypto/services/utils';
import { LegacyShardMeta } from './types';
import { BUCKET_META_MAGIC } from './networkConstants';

export function createAES256Cipher(key: Buffer, iv: Buffer): Cipher {
  return createCipheriv('aes-256-ctr', key, iv);
}

export function Aes256gcmEncrypter(key: Buffer, iv: Buffer): crypto.CipherGCM {
  return crypto.createCipheriv('aes-256-gcm', key, iv);
}

export function generateHMAC(
  shardMetas: Omit<LegacyShardMeta, 'challenges' | 'challenges_as_str' | 'tree'>[],
  encryptionKey: Buffer,
): Promise<string> {
  const shardHashesSorted = [...shardMetas].sort((sA, sB) => sA.index - sB.index);
  const hashArray: string[] = [];
  for (const shardMeta of shardHashesSorted) {
    hashArray.push(shardMeta.hash);
  }

  return getHmacSha512(encryptionKey, hashArray);
}

function getDeterministicKey(key: string, data: string): Promise<string> {
  const input = key + data;

  return getSha512FromHex(input);
}

async function getBucketKey(mnemonic: string, bucketId: string): Promise<string> {
  const seed = (await mnemonicToSeed(mnemonic)).toString('hex');
  const hash = await getDeterministicKey(seed, bucketId);

  return hash.slice(0, 64);
}

export function encryptMeta(fileMeta: string, key: Buffer, iv: Buffer): string {
  const cipher: CipherCCM = Aes256gcmEncrypter(key, iv);
  const cipherTextBuf = Buffer.concat([cipher.update(fileMeta, 'utf8'), cipher.final()]);
  const digest = cipher.getAuthTag();

  return Buffer.concat([digest, iv, cipherTextBuf]).toString('base64');
}

export async function encryptFilename(mnemonic: string, bucketId: string, filename: string): Promise<string> {
  const bucketKey = await getBucketKey(mnemonic, bucketId);
  const encryptionKeyHex = await getHmacSha512FromHexKey(bucketKey, [Buffer.from(BUCKET_META_MAGIC)]);
  const encryptionKey = Buffer.from(encryptionKeyHex, 'hex').subarray(0, 32);
  const encryptionIvHex = await getHmacSha512FromHexKey(bucketKey, [bucketId, filename]);
  const encryptionIv = Buffer.from(encryptionIvHex, 'hex').subarray(0, 32);
  return encryptMeta(filename, encryptionKey, encryptionIv);
}

/**
 * Given a stream and a cipher, encrypt its content
 * @param readable Readable stream
 * @param cipher Cipher used to encrypt the content
 * @returns A readable whose output is the encrypted content of the source stream
 */
export function encryptReadable(readable: ReadableStream<Uint8Array>, cipher: Cipher): ReadableStream<Uint8Array> {
  const reader = readable.getReader();

  const encryptedFileReadable = new ReadableStream({
    async start(controller) {
      let done = false;

      while (!done) {
        const status = await reader.read();

        if (!status.done) {
          controller.enqueue(cipher.update(status.value));
        }

        done = status.done;
      }
      controller.close();
    },
  });

  return encryptedFileReadable;
}

export function encryptStreamInParts(
  plainFile: { size: number; stream(): ReadableStream<Uint8Array> },
  cipher: Cipher,
  uploadChunkSize: number,
  allowedChunkOverhead: number,
): ReadableStream<Uint8Array> {
  const readable = plainFile.stream();

  const reader = readable.getReader();

  // allowedChunkOverhead ensures encrypted data can be buffered even when its sizes don't align perfectly with uploadChunkSize
  const bufferSize = uploadChunkSize + allowedChunkOverhead;
  let buffer = new Uint8Array(bufferSize);
  let offset = 0;
  let finished = false;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (offset < uploadChunkSize && !finished) {
        const { value, done } = await reader.read();

        const encryptedChunk = done ? cipher.final() : cipher.update(value);

        // Buffer overflow protection
        // Should never happen with AES-CTR (1:1 ratio output/input) but prevents crashes if cipher is changed
        const requiredLength = offset + encryptedChunk.length;
        if (requiredLength > buffer.length) {
          console.log('Applying buffer overflow protection');
          const newBuffer = new Uint8Array(requiredLength);
          newBuffer.set(buffer.subarray(0, offset), 0);
          buffer = newBuffer;
        }

        buffer.set(encryptedChunk, offset);
        offset += encryptedChunk.length;

        if (done) finished = done;
      }

      if (offset >= uploadChunkSize) {
        controller.enqueue(buffer.slice(0, uploadChunkSize));
        buffer.set(buffer.slice(uploadChunkSize, offset), 0);
        offset = offset - uploadChunkSize;
      }

      if (finished) {
        if (offset > 0) {
          controller.enqueue(buffer.slice(0, offset));
        }
        controller.close();
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}

export async function getEncryptedFile(
  plainFile: { stream(): ReadableStream<Uint8Array> },
  cipher: Cipher,
  fileLength: number,
): Promise<[Uint8Array, string]> {
  const readable = encryptReadable(plainFile.stream(), cipher).getReader();
  const hasher = await getSha256Hasher();
  hasher.init();
  const fileParts: Uint8Array = new Uint8Array(fileLength);

  let done = false;
  let offset = 0;

  while (!done) {
    const status = await readable.read();

    if (!status.done) {
      hasher.update(status.value);
      fileParts.set(status.value, offset);
      offset += status.value.length;
    }

    done = status.done;
  }

  const sha256Result = hasher.digest();

  return [fileParts, await getRipemd160FromHex(sha256Result)];
}

export async function processEveryFileBlobReturnHash(
  chunkedFileReadable: ReadableStream<Uint8Array>,
  onEveryChunk: (part: Uint8Array) => Promise<void>,
): Promise<string> {
  const reader = chunkedFileReadable.getReader();
  const hasher = await getSha256Hasher();
  hasher.init();

  let done = false;

  while (!done) {
    const status = await reader.read();
    if (!status.done) {
      const value = status.value;
      hasher.update(value);
      await onEveryChunk(value);
    }

    done = status.done;
  }

  const sha256Result = hasher.digest();
  return await getRipemd160FromHex(sha256Result);
}

// ENCRYPTION FOR FILE KEY
export async function generateFileKey(mnemonic: string, bucketId: string, index: Buffer): Promise<Buffer> {
  const bucketKey = await generateFileBucketKey(mnemonic, bucketId);

  return (await getFileDeterministicKey(bucketKey.subarray(0, 32), index)).subarray(0, 32);
}

export async function generateFileBucketKey(mnemonic: string, bucketId: string): Promise<Buffer> {
  const seed = await mnemonicToSeed(mnemonic);

  return getFileDeterministicKey(seed, Buffer.from(bucketId, 'hex'));
}

export async function getFileDeterministicKey(key: Buffer, data: Buffer): Promise<Buffer> {
  const hashHex = await getSha512Combined(key, data);
  return Buffer.from(hashHex, 'hex');
}
