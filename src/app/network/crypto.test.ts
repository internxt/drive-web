/**
 * @jest-environment jdom
 */

import { describe, expect, it } from 'vitest';
import { encryptFilename } from './crypto';
import { Buffer } from 'buffer';

describe('Test file encryption', () => {
  globalThis.Buffer = Buffer;
  it('encryptFilename should generate a ciphertext', async () => {
    const mnemonic =
      'until bonus summer risk chunk oyster census ability frown win pull steel measure employ rigid improve riot remind system earn inch broken chalk clip';
    const bucketId = 'test busket id';
    const filename = 'test filename';
    const result = await encryptFilename(mnemonic, bucketId, filename);
    expect(result).toBeDefined();
  });
});
