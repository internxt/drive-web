/**
 * @jest-environment jdom
 */

import { Buffer } from 'buffer';
import crypto from 'crypto';
import { describe, expect, it, vi } from 'vitest';
import { getSha256 } from '../crypto/services/utils';
import {
  Aes256gcmEncrypter,
  encryptFilename,
  generateFileBucketKey,
  generateFileKey,
  generateHMAC,
  getEncryptedFile,
  getFileDeterministicKey,
  processEveryFileBlobReturnHash,
} from './crypto';

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
      const encryptionKey = crypto
        .createHmac('sha512', Buffer.from(bucketKey, 'hex'))
        .update(Buffer.from(BUCKET_META_MAGIC))
        .digest()
        .slice(0, 32);
      const encryptionIv = crypto
        .createHmac('sha512', Buffer.from(bucketKey, 'hex'))
        .update(bucketId)
        .update(filename)
        .digest()
        .slice(0, 32);
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

describe('File key generation functions', () => {
  globalThis.Buffer = Buffer;

  it('generateFileKey should return 32-byte buffer', async () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const bucketId = 'test';
    const index = Buffer.from([0, 0, 0, 1]);

    const result = await generateFileKey(mnemonic, bucketId, index);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBe(32);
  });

  it('generateFileBucketKey should return 64-byte buffer', async () => {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const bucketId = 'test';

    const result = await generateFileBucketKey(mnemonic, bucketId);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBe(64);
  });

  it('getFileDeterministicKey should return 64-byte buffer', async () => {
    const key = Buffer.from('test_key');
    const data = Buffer.from('test_data');

    const result = await getFileDeterministicKey(key, data);

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBe(64);
  });
  describe('Comparison with old functions', () => {
    globalThis.Buffer = Buffer;
    async function oldGenerateFileKey(mnemonic: string, bucketId: string, index: Buffer | string): Promise<Buffer> {
      const bucketKey = await oldGenerateFileBucketKey(mnemonic, bucketId);
      return oldGetFileDeterministicKey(bucketKey.slice(0, 32), index).slice(0, 32);
    }

    async function oldGenerateFileBucketKey(mnemonic: string, bucketId: string): Promise<Buffer> {
      const seed = await mnemonicToSeed(mnemonic);
      return oldGetFileDeterministicKey(seed, Buffer.from(bucketId, 'hex'));
    }

    function oldGetFileDeterministicKey(key: Buffer | string, data: Buffer | string): Buffer {
      const hash = crypto.createHash('sha512');
      hash.update(key).update(data);
      return hash.digest();
    }

    it('generateFileKey should produce same result as old GenerateFileKey', async () => {
      const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const bucketId = 'test';
      const index = Buffer.from([0, 0, 0, 1]);

      const newResult = await generateFileKey(mnemonic, bucketId, index);
      const oldResult = await oldGenerateFileKey(mnemonic, bucketId, index);

      expect(newResult.equals(oldResult)).toBe(true);
    });

    it('generateFileBucketKey should produce same result as old GenerateFileBucketKey', async () => {
      const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const bucketId = 'test';

      const newResult = await generateFileBucketKey(mnemonic, bucketId);
      const oldResult = await oldGenerateFileBucketKey(mnemonic, bucketId);

      expect(newResult.equals(oldResult)).toBe(true);
    });

    it('getFileDeterministicKey should produce same result as old GetFileDeterministicKey', async () => {
      const key = Buffer.from('test_key');
      const data = Buffer.from('test_data');

      const newResult = await getFileDeterministicKey(key, data);
      const oldResult = oldGetFileDeterministicKey(key, data);

      expect(newResult.equals(oldResult)).toBe(true);
    });
  });
});
