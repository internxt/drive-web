/**
 * @jest-environment jdom
 */

import { describe, expect, it, vi } from 'vitest';
import {
  encryptFilename,
  generateHMAC,
  getEncryptedFile,
  processEveryFileBlobReturnHash,
  encryptReadable,
} from './crypto';
import { Buffer } from 'buffer';
import crypto from 'crypto';
import { Sha256 } from 'asmcrypto.js';
import { getSha256 } from '../crypto/services/utils';
import { Aes256gcmEncrypter, sha512HmacBufferFromHex } from '@internxt/inxt-js/build/lib/utils/crypto';
import { mnemonicToSeed } from 'bip39';

describe('Test crypto.ts functions', () => {
  globalThis.Buffer = Buffer;
  it('encryptFilename should generate a ciphertext', async () => {
    const mnemonic =
      'until bonus summer risk chunk oyster census ability frown win pull steel measure employ rigid improve riot remind system earn inch broken chalk clip';
    const bucketId = 'test busket id';
    const filename = 'test filename';
    const result = await encryptFilename(mnemonic, bucketId, filename);
    expect(result).toBeDefined();
  });

  it('encryptFilename should return the same result as before', async () => {
    const mnemonic =
      'until bonus summer risk chunk oyster census ability frown win pull steel measure employ rigid improve riot remind system earn inch broken chalk clip';
    const bucketId = 'test busket id';
    const filename = 'test filename';
    const result = await encryptFilename(mnemonic, bucketId, filename);

    const BUCKET_META_MAGIC = [
      66, 150, 71, 16, 50, 114, 88, 160, 163, 35, 154, 65, 162, 213, 226, 215, 70, 138, 57, 61, 52, 19, 210, 170, 38,
      164, 162, 200, 86, 201, 2, 81,
    ];

    function oldGetDeterministicKey(key: string, data: string): Buffer {
      const input = key + data;
      return crypto.createHash('sha512').update(Buffer.from(input, 'hex')).digest();
    }
    async function getBucketKey(mnemonic: string, bucketId: string): Promise<string> {
      const seed = (await mnemonicToSeed(mnemonic)).toString('hex');
      return oldGetDeterministicKey(seed, bucketId).toString('hex').slice(0, 64);
    }
    function encryptMeta(fileMeta: string, key: Buffer, iv: Buffer): string {
      const cipher: crypto.CipherCCM = Aes256gcmEncrypter(key, iv);
      const cipherTextBuf = Buffer.concat([cipher.update(fileMeta, 'utf8'), cipher.final()]);
      const digest = cipher.getAuthTag();
      return Buffer.concat([digest, iv, cipherTextBuf]).toString('base64');
    }
    async function oldEncryptFilename(mnemonic: string, bucketId: string, filename: string): Promise<string> {
      const bucketKey = await getBucketKey(mnemonic, bucketId);
      const encryptionKey = sha512HmacBufferFromHex(bucketKey)
        .update(Buffer.from(BUCKET_META_MAGIC))
        .digest()
        .slice(0, 32);
      const encryptionIv = sha512HmacBufferFromHex(bucketKey).update(bucketId).update(filename).digest().slice(0, 32);
      return encryptMeta(filename, encryptionKey, encryptionIv);
    }

    const oldResult = await oldEncryptFilename(mnemonic, bucketId, filename);
    expect(result).toBe(oldResult);
  });

  it('generateHMAC should generate hmac', async () => {
    const encryptionKey = Buffer.from('0b68dcbb255a4e654bbf361e73cf1b98', 'hex');
    const shardMeta = {
      challenges_as_str: [],
      hash: '',
      index: 0,
      parity: false,
      size: 0,
      tree: [],
    };
    const result = await generateHMAC([shardMeta], encryptionKey);
    expect(result).toBe(
      '85cb55bde42af491c544866d35e2b1fd7a6999d83181782a91c63484a5ff93e0ab1e07d0e09cfa057c0481fc68012cc300de95512f4fcbe9466ee8ca85134b7c',
    );
  });

  function createMockFile(name: string, size = 0, type = ''): File {
    return {
      name,
      size,
      type,
      slice: vi.fn(),
      stream: vi.fn().mockReturnValueOnce(
        new ReadableStream({
          start(controller) {
            // You can push chunks of data into the stream, e.g.:
            controller.enqueue(new TextEncoder().encode('file contents'));
            controller.close();
          },
        }),
      ),
    } as unknown as File;
  }

  it('getEncryptedFile should generate encrypted text and hash', async () => {
    const encryptionKey = Buffer.from('d82fc82d9265a60aa0d7e703e11809ba60b45038aec705f77d5f84630043b118', 'hex');
    const iv = Buffer.from('0b68dcbb255a4e654bbf361e73cf1b98', 'hex');
    const file = createMockFile('file.txt', 13, 'text/plain');
    const cipher = crypto.createCipheriv('aes-256-ctr', encryptionKey, iv);
    const [encryptedFile, hash] = await getEncryptedFile(file, cipher);
    expect(encryptedFile).toBeDefined();
    expect(hash).toBe('422dab11a4f44c2ceab1f8ef39827109989607d6');
  });

  it('getEncryptedFile should return the same result as before', async () => {
    const encryptionKey = Buffer.from('d82fc82d9265a60aa0d7e703e11809ba60b45038aec705f77d5f84630043b118', 'hex');
    const iv = Buffer.from('0b68dcbb255a4e654bbf361e73cf1b98', 'hex');
    const file = createMockFile('file.txt', 13, 'text/plain');
    const cipher = crypto.createCipheriv('aes-256-ctr', encryptionKey, iv);
    const [encryptedFile, hash] = await getEncryptedFile(file, cipher);

    async function oldGetEncryptedFile(
      plainFile: { stream(): ReadableStream<Uint8Array> },
      cipher: crypto.Cipher,
    ): Promise<[Blob, string]> {
      const readable = encryptReadable(plainFile.stream(), cipher).getReader();
      const hasher = new Sha256();
      const blobParts: Uint8Array[] = [];

      let done = false;

      while (!done) {
        const status = await readable.read();

        if (!status.done) {
          hasher.process(status.value);
          blobParts.push(status.value);
        }

        done = status.done;
      }

      hasher.finish();

      return [
        new Blob(blobParts, { type: 'application/octet-stream' }),
        crypto
          .createHash('ripemd160')
          .update(Buffer.from(hasher.result as Uint8Array))
          .digest('hex'),
      ];
    }

    const oldFile = createMockFile('file.txt', 13, 'text/plain');
    const oldCipher = crypto.createCipheriv('aes-256-ctr', encryptionKey, iv);
    const [oldEncryptedFile, oldHash] = await oldGetEncryptedFile(oldFile, oldCipher);
    expect(encryptedFile).toStrictEqual(oldEncryptedFile);
    expect(hash).toBe(oldHash);
  });

  function getReadableStream() {
    return new ReadableStream({
      async start(controller) {
        const chunks = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6]), new Uint8Array([7, 8, 9])];
        for (const chunk of chunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });
  }

  it('processEveryFileBlobReturnHash should generate hash', async () => {
    const chunkedFileReadable = getReadableStream();

    const receivedBlobs: unknown[] = [];
    const onEveryBlob = async <T>(blob: T) => {
      receivedBlobs.push(blob);
    };
    const hash = await processEveryFileBlobReturnHash(chunkedFileReadable, onEveryBlob);
    expect(hash).toBe('64cb6df86e542fde414f3e80624bb174151d9740');
    expect(receivedBlobs.length).toBe(3);
  });

  it('processEveryFileBlobReturnHash should generate the same hash as before', async () => {
    const chunkedFileReadable = getReadableStream();

    const receivedBlobs: unknown[] = [];
    const onEveryBlob = async <T>(blob: T) => {
      receivedBlobs.push(blob);
    };
    const hash = await processEveryFileBlobReturnHash(chunkedFileReadable, onEveryBlob);

    async function oldProcessEveryFileBlobReturnHash(
      chunkedFileReadable: ReadableStream<Uint8Array>,
      onEveryBlob: (blob: Blob) => Promise<void>,
    ): Promise<string> {
      const reader = chunkedFileReadable.getReader();
      const hasher = new Sha256();

      let done = false;

      while (!done) {
        const status = await reader.read();
        if (!status.done) {
          const value = status.value;
          hasher.process(value);
          const blob = new Blob([value], { type: 'application/octet-stream' });
          await onEveryBlob(blob);
        }

        done = status.done;
      }

      hasher.finish();

      return crypto
        .createHash('ripemd160')
        .update(Buffer.from(hasher.result as Uint8Array))
        .digest('hex');
    }

    const oldReceivedBlobs: unknown[] = [];
    const oldOnEveryBlob = async <T>(blob: T) => {
      oldReceivedBlobs.push(blob);
    };
    const oldChunkedFileReadable = getReadableStream();
    const oldHash = await oldProcessEveryFileBlobReturnHash(oldChunkedFileReadable, oldOnEveryBlob);

    expect(hash).toBe(oldHash);
    expect(receivedBlobs).toStrictEqual(oldReceivedBlobs);
  });

  it('getSha256 should generate the same result as sha256 from crypto', async () => {
    function oldSha256(input: Buffer): Buffer {
      return crypto.createHash('sha256').update(input).digest();
    }
    const pass = 'Test password';
    const hash = await getSha256(pass);
    const oldHash = oldSha256(Buffer.from(pass)).toString('hex');
    expect(hash).toBe(oldHash);
  });
});
