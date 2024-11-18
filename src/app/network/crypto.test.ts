/**
 * @jest-environment jdom
 */

import { describe, expect, it, vi } from 'vitest';
import { encryptFilename, generateHMAC, getEncryptedFile, processEveryFileBlobReturnHash } from './crypto';
import { Buffer } from 'buffer';
import crypto from 'crypto';

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

  it('getEncryptedFile should generate encrypted text and hash', async () => {
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
    const encryptionKey = Buffer.from('d82fc82d9265a60aa0d7e703e11809ba60b45038aec705f77d5f84630043b118', 'hex');
    const iv = Buffer.from('0b68dcbb255a4e654bbf361e73cf1b98', 'hex');
    const file = createMockFile('file.txt', 13, 'text/plain');
    const cipher = crypto.createCipheriv('aes-256-ctr', encryptionKey, iv);
    const [encryptedFile, hash] = await getEncryptedFile(file, cipher);
    expect(encryptedFile).toBeDefined();
    expect(hash).toBe('61143e9907dd4a02f733083f9c3f31ae7370c8e4');
  });

  it('processEveryFileBlobReturnHash should generate hash', async () => {
    const chunkedFileReadable = new ReadableStream({
      async start(controller) {
        const chunks = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6]), new Uint8Array([7, 8, 9])];
        for (const chunk of chunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });

    const receivedBlobs: unknown[] = [];
    const onEveryBlob = async <T>(blob: T) => {
      receivedBlobs.push(blob);
    };
    const hash = await processEveryFileBlobReturnHash(chunkedFileReadable, onEveryBlob);
    expect(hash).toBe('3afeb50a1fc2325f5faa8d46b49ef16a8ebe7660');
    expect(receivedBlobs.length).toBe(3);
  });
});
