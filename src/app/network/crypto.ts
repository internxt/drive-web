import { ShardMeta } from '@internxt/inxt-js/build/lib/models';
import { Aes256gcmEncrypter } from '@internxt/inxt-js/build/lib/utils/crypto';
import { mnemonicToSeed } from 'bip39';
import { Cipher, CipherCCM, createCipheriv } from 'crypto';
import {
  getHmacSha512FromHexKey,
  getHmacSha512,
  getSha256Hasher,
  getRipemd160FromHex,
  getSha512FromHex,
} from '../crypto/services/utils';

const BUCKET_META_MAGIC = [
  66, 150, 71, 16, 50, 114, 88, 160, 163, 35, 154, 65, 162, 213, 226, 215, 70, 138, 57, 61, 52, 19, 210, 170, 38, 164,
  162, 200, 86, 201, 2, 81,
];

export function createAES256Cipher(key: Buffer, iv: Buffer): Cipher {
  return createCipheriv('aes-256-ctr', key, iv);
}

export function generateHMAC(
  shardMetas: Omit<ShardMeta, 'challenges' | 'challenges_as_str' | 'tree'>[],
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
  extraPreAllocatedSpace: number,
): ReadableStream<Uint8Array> {
  const readable = plainFile.stream();

  const reader = readable.getReader();
  const preAllocated = uploadChunkSize + extraPreAllocatedSpace;
  let buffer = new Uint8Array(preAllocated);
  let bufferLength = 0;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      while (bufferLength < uploadChunkSize) {
        const { value, done } = await reader.read();

        const encryptedChunk = done ? cipher.final() : cipher.update(value);

        const requiredLength = bufferLength + encryptedChunk.length;
        if (requiredLength > buffer.length) {
          const newBuffer = new Uint8Array(requiredLength);
          newBuffer.set(buffer.subarray(0, bufferLength), 0);
          buffer = newBuffer;
        }

        buffer.set(encryptedChunk, bufferLength);
        bufferLength += encryptedChunk.length;

        if (done) {
          if (bufferLength > 0) {
            controller.enqueue(buffer.slice(0, bufferLength));
          }
          controller.close();
          return;
        }
      }

      controller.enqueue(buffer.slice(0, bufferLength));
      bufferLength = 0;
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

  let offset = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await readable.read();
    if (done) break;

    hasher.update(value);
    fileParts.set(value, offset);
    offset += value.length;
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
