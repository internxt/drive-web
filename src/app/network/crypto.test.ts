/**
 * @jest-environment jdom
 */

import { describe, expect, it, vi } from 'vitest';
import { encryptFilename, generateHMAC, getEncryptedFile } from './crypto';
import { getHmacSha512 } from '../crypto/services/utils';
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
    const encryptionKey = crypto.randomBytes(16);
    const shardMeta = {
      challenges_as_str: [],
      hash: '',
      index: 0,
      parity: false,
      size: 0,
      tree: [],
    };
    const result = await generateHMAC([shardMeta], encryptionKey);
    const expectedResult = await getHmacSha512(encryptionKey, ['']);
    expect(result).toBeDefined();
    expect(result).toBe(expectedResult);
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
    const encryptionKey = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    const file = createMockFile(`file.txt`, 13, 'text/plain');
    const cipher = crypto.createCipheriv('aes-256-ctr', encryptionKey, iv);
    const [encryptedFile, hash] = await getEncryptedFile(file, cipher);
    expect(encryptedFile).toBeDefined();
    expect(hash).toBeDefined();
  });
});
