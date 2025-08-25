/**
 * @jest-environment jdom
 */

import { Buffer } from 'buffer';
import crypto from 'crypto';
import { describe, expect, it, vi } from 'vitest';
import {
  Aes256gcmEncrypter,
  encryptFilename,
  generateFileBucketKey,
  generateFileKey,
  generateHMAC,
  getEncryptedFile,
  getFileDeterministicKey,
  processEveryFileBlobReturnHash,
  encryptStreamInParts,
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

  it('encryptFilename should return correct result', async () => {
    const mnemonic =
      'until bonus summer risk chunk oyster census ability frown win pull steel measure employ rigid improve riot remind system earn inch broken chalk clip';
    const bucketId = 'test busket id';
    const filename = 'test filename';
    const result = await encryptFilename(mnemonic, bucketId, filename);
    expect(result).toBe('+iEqY7fQH9IRS//uFEiLwA8RBa7UGI3LhB0nNMcegc2IMHagNzUoENLzqtsrNx5RfQc3hBUq8z5FXJk3Yw==');
  });

  it('generateHMAC should generate correct hmac', async () => {
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
    const [encryptedFile, hash] = await getEncryptedFile(file, cipher, file.size);
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

  it('processEveryFileBlobReturnHash should generate correct hash', async () => {
    const chunkedFileReadable = getReadableStream();

    const receivedBlobs: unknown[] = [];
    const onEveryBlob = async <T>(blob: T) => {
      receivedBlobs.push(blob);
    };
    const hash = await processEveryFileBlobReturnHash(chunkedFileReadable, onEveryBlob);
    expect(hash).toBe('64cb6df86e542fde414f3e80624bb174151d9740');
    expect(receivedBlobs.length).toBe(3);
  });

  function createZeroFile(
    fileSizeInBytes: number,
    chunkSizeInBytes: number,
  ): {
    size: number;
    stream(): ReadableStream<Uint8Array>;
  } {
    const result = {
      size: fileSizeInBytes,
      stream() {
        let bytesServed = 0;
        return new ReadableStream<Uint8Array>({
          pull(controller) {
            const remaining = fileSizeInBytes - bytesServed;
            if (remaining <= 0) {
              controller.close();
              return;
            }

            const chunkSize = Math.min(chunkSizeInBytes, remaining);
            const chunk = new Uint8Array(chunkSize);
            controller.enqueue(chunk);
            bytesServed += chunkSize;
          },
        });
      },
    };

    return result;
  }

  async function processStreamToCompletion(
    readable: ReadableStream<Uint8Array>,
  ): Promise<{ chunkCount: number; totalSize: number; encryptedFile: Uint8Array[] }> {
    const reader = readable.getReader();
    const encryptedFile: Uint8Array[] = [];
    let totalSize = 0;
    let chunkCount = 0;

    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunkCount++;
        totalSize += value.length;
        encryptedFile.push(value);
      }

      return { chunkCount, totalSize, encryptedFile };
    } finally {
      reader.releaseLock();
    }
  }

  function getTestCipher() {
    const key = Buffer.from('d82fc82d9265a60aa0d7e703e11809ba60b45038aec705f77d5f84630043b118', 'hex');
    const iv = Buffer.from('0b68dcbb255a4e654bbf361e73cf1b98', 'hex');
    return crypto.createCipheriv('aes-256-ctr', key, iv);
  }

  it('encryptStreamInParts should give the same result as the entier file encryption', async () => {
    const uploadChunkSize = 10;
    const chunkSize = 5;
    const overhead = 1;
    const fileSize = 7 * uploadChunkSize;
    const streamCipher = getTestCipher();
    const file = createZeroFile(fileSize, chunkSize);
    const spy = vi.spyOn(console, 'log');

    const encryptedStream = encryptStreamInParts(file, streamCipher, uploadChunkSize, overhead);
    const { encryptedFile } = await processStreamToCompletion(encryptedStream);
    const flatEncryptedFile = Uint8Array.from(encryptedFile.flatMap((a) => [...a]));

    const text = Buffer.alloc(fileSize).toString();
    const cipher = getTestCipher();
    const encrypted = Uint8Array.from(Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]));

    expect(encrypted).toStrictEqual(flatEncryptedFile);
    expect(spy).not.toHaveBeenCalled();
  });

  it('encryptStreamInParts should correctly encrypt file when chunkSize < uploadChunkSize', async () => {
    const uploadChunkSize = 10;
    const chunkSize = 5;
    const overhead = 1;
    const fileSize = 7 * uploadChunkSize + 1;
    const cipher = getTestCipher();
    const file = createZeroFile(fileSize, chunkSize);
    const spy = vi.spyOn(console, 'log');

    const encryptedStream = encryptStreamInParts(file, cipher, uploadChunkSize, overhead);
    const result = await processStreamToCompletion(encryptedStream);

    const expectedEncryptedFile = [
      new Uint8Array([1, 154, 92, 204, 248, 101, 81, 115, 77, 1]),
      new Uint8Array([38, 164, 222, 12, 52, 182, 246, 171, 32, 103]),
      new Uint8Array([73, 196, 170, 85, 160, 122, 57, 220, 85, 142]),
      new Uint8Array([80, 134, 15, 169, 200, 223, 33, 106, 90, 252]),
      new Uint8Array([22, 66, 64, 243, 231, 169, 203, 203, 88, 253]),
      new Uint8Array([195, 91, 10, 103, 145, 133, 158, 13, 24, 87]),
      new Uint8Array([60, 92, 184, 5, 86, 129, 103, 180, 68, 151]),
      new Uint8Array([78]),
    ];

    expect(result.chunkCount).toBe(expectedEncryptedFile.length);
    expect(result.totalSize).toBe(fileSize);
    expect(result.encryptedFile).toStrictEqual(expectedEncryptedFile);
    expect(spy).not.toHaveBeenCalled();
  });

  it('encryptStreamInParts should correctly encrypt file when fileSize = chunkSize = uploadChunkSize', async () => {
    const uploadChunkSize = 10;
    const chunkSize = uploadChunkSize;
    const overhead = 2;
    const fileSize = uploadChunkSize;
    const cipher = getTestCipher();
    const file = createZeroFile(fileSize, chunkSize);
    const spy = vi.spyOn(console, 'log');

    const encryptedStream = encryptStreamInParts(file, cipher, uploadChunkSize, overhead);
    const result = await processStreamToCompletion(encryptedStream);

    const expectedEncryptedFile = [new Uint8Array([1, 154, 92, 204, 248, 101, 81, 115, 77, 1])];

    expect(result.chunkCount).toBe(expectedEncryptedFile.length);
    expect(result.totalSize).toBe(fileSize);
    expect(result.encryptedFile).toStrictEqual(expectedEncryptedFile);
    expect(spy).not.toHaveBeenCalled();
  });

  it('encryptStreamInParts should correctly encrypt file when chunkSize = uploadChunkSize + overhead', async () => {
    const uploadChunkSize = 10;
    const overhead = 2;
    const chunkSize = uploadChunkSize + overhead;
    const fileSize = 3 * uploadChunkSize + 1;
    const cipher = getTestCipher();
    const file = createZeroFile(fileSize, chunkSize);
    const spy = vi.spyOn(console, 'log');

    const encryptedStream = encryptStreamInParts(file, cipher, uploadChunkSize, overhead);
    const result = await processStreamToCompletion(encryptedStream);
    const expectedEncryptedFile = [
      new Uint8Array([1, 154, 92, 204, 248, 101, 81, 115, 77, 1]),
      new Uint8Array([38, 164, 222, 12, 52, 182, 246, 171, 32, 103]),
      new Uint8Array([73, 196, 170, 85, 160, 122, 57, 220, 85, 142]),
      new Uint8Array([80]),
    ];

    expect(result.chunkCount).toBe(expectedEncryptedFile.length);
    expect(result.totalSize).toBe(fileSize);
    expect(result.encryptedFile).toStrictEqual(expectedEncryptedFile);
    expect(spy).toHaveBeenCalled();
  });

  it('encryptStreamInParts should correctly encrypt file when uploadChunkSize = 2*chunkSize', async () => {
    const chunkSize = 5;
    const uploadChunkSize = 2 * chunkSize;
    const overhead = 2;

    const fileSize = 2 * uploadChunkSize + 1;
    const cipher = getTestCipher();
    const file = createZeroFile(fileSize, chunkSize);
    const spy = vi.spyOn(console, 'log');

    const encryptedStream = encryptStreamInParts(file, cipher, uploadChunkSize, overhead);
    const result = await processStreamToCompletion(encryptedStream);
    const expectedEncryptedFile = [
      new Uint8Array([1, 154, 92, 204, 248, 101, 81, 115, 77, 1]),
      new Uint8Array([38, 164, 222, 12, 52, 182, 246, 171, 32, 103]),
      new Uint8Array([73]),
    ];

    expect(result.chunkCount).toBe(expectedEncryptedFile.length);
    expect(result.totalSize).toBe(fileSize);
    expect(result.encryptedFile).toStrictEqual(expectedEncryptedFile);
    expect(spy).not.toHaveBeenCalled();
  });

  it('encryptStreamInParts should correctly encrypt file when chunkSize < uploadChunkSize, file size is multiple of uploadChunkSize', async () => {
    const uploadChunkSize = 10;
    const chunkSize = 3;
    const overhead = 2;
    const fileSize = 7 * uploadChunkSize;
    const cipher = getTestCipher();
    const file = createZeroFile(fileSize, chunkSize);
    const spy = vi.spyOn(console, 'log');

    const encryptedStream = encryptStreamInParts(file, cipher, uploadChunkSize, overhead);
    const result = await processStreamToCompletion(encryptedStream);

    const expectedEncryptedFile = [
      new Uint8Array([1, 154, 92, 204, 248, 101, 81, 115, 77, 1]),
      new Uint8Array([38, 164, 222, 12, 52, 182, 246, 171, 32, 103]),
      new Uint8Array([73, 196, 170, 85, 160, 122, 57, 220, 85, 142]),
      new Uint8Array([80, 134, 15, 169, 200, 223, 33, 106, 90, 252]),
      new Uint8Array([22, 66, 64, 243, 231, 169, 203, 203, 88, 253]),
      new Uint8Array([195, 91, 10, 103, 145, 133, 158, 13, 24, 87]),
      new Uint8Array([60, 92, 184, 5, 86, 129, 103, 180, 68, 151]),
    ];

    expect(result.chunkCount).toBe(expectedEncryptedFile.length);
    expect(result.totalSize).toBe(fileSize);
    expect(result.encryptedFile).toStrictEqual(expectedEncryptedFile);
    expect(spy).not.toHaveBeenCalled();
  });

  it('encryptStreamInParts should correctly encrypt file even if chunkSize > uploadChunkSize', async () => {
    const uploadChunkSize = 10;
    const chunkSize = 13;
    const overhead = 1;
    const fileSize = 7 * uploadChunkSize + 1;
    const cipher = getTestCipher();
    const file = createZeroFile(fileSize, chunkSize);
    const spy = vi.spyOn(console, 'log');

    const encryptedStream = encryptStreamInParts(file, cipher, uploadChunkSize, overhead);
    const result = await processStreamToCompletion(encryptedStream);

    const expectedEncryptedFile = [
      new Uint8Array([1, 154, 92, 204, 248, 101, 81, 115, 77, 1]),
      new Uint8Array([38, 164, 222, 12, 52, 182, 246, 171, 32, 103]),
      new Uint8Array([73, 196, 170, 85, 160, 122, 57, 220, 85, 142]),
      new Uint8Array([80, 134, 15, 169, 200, 223, 33, 106, 90, 252]),
      new Uint8Array([22, 66, 64, 243, 231, 169, 203, 203, 88, 253]),
      new Uint8Array([195, 91, 10, 103, 145, 133, 158, 13, 24, 87]),
      new Uint8Array([60, 92, 184, 5, 86, 129, 103, 180, 68, 151]),
      new Uint8Array([78]),
    ];

    expect(result.chunkCount).toBe(expectedEncryptedFile.length);
    expect(result.totalSize).toBe(fileSize);
    expect(result.encryptedFile).toStrictEqual(expectedEncryptedFile);
    expect(spy).toHaveBeenCalled();
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
