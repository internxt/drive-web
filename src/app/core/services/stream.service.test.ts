import { describe, it, expect, vi, beforeEach, test } from 'vitest';

vi.mock('crypto', () => ({
  createDecipheriv: vi.fn(),
}));

import { decryptStream } from './stream.service';
import { getDecryptedStream } from 'app/network/download';
import { createDecipheriv } from 'crypto';

vi.mock('app/network/download', () => ({
  getDecryptedStream: vi.fn(
    () =>
      new ReadableStream({
        start(controller) {
          controller.close();
        },
      }),
  ),
}));

describe('Stream service', () => {
  let mockDecipher: any;
  let mockKey: Buffer;
  let mockIv: Buffer;
  let mockInputSlices: ReadableStream<Uint8Array>[];

  beforeEach(() => {
    vi.clearAllMocks();
    mockKey = Buffer.from('0'.repeat(64), 'hex');
    mockIv = Buffer.from('0'.repeat(32), 'hex');
    mockDecipher = {
      update: vi.fn(),
    };
    vi.mocked(createDecipheriv).mockReturnValue(mockDecipher);
    mockInputSlices = [
      new ReadableStream({
        start(controller) {
          controller.close();
        },
      }),
    ];
  });

  describe('Decrypt Stream', () => {
    test('When there is no offset, then should create a new cipher', () => {
      const result = decryptStream(mockInputSlices, mockKey, mockIv);

      expect(createDecipheriv).toHaveBeenCalledWith('aes-256-ctr', mockKey, mockIv);
      expect(mockDecipher.update).not.toHaveBeenCalled();
      expect(getDecryptedStream).toHaveBeenCalledWith(mockInputSlices, mockDecipher);
      expect(result).toBeInstanceOf(ReadableStream);
    });

    it('When there is an offset, then should calculate a new IV and skip the buffer', () => {
      const startOffsetByte = 20;

      const ivBigInt = BigInt('0x' + mockIv.toString('hex'));
      const expectedNewIvHex = (ivBigInt + BigInt(1)).toString(16).padStart(32, '0');
      const expectedNewIv = Buffer.from(expectedNewIvHex, 'hex');
      const expectedSkipBuffer = Buffer.alloc(4, 0);

      const result = decryptStream(mockInputSlices, mockKey, mockIv, startOffsetByte);

      expect(createDecipheriv).toHaveBeenCalledWith('aes-256-ctr', mockKey, expectedNewIv);
      expect(mockDecipher.update).toHaveBeenCalledWith(expectedSkipBuffer);
      expect(getDecryptedStream).toHaveBeenCalledWith(mockInputSlices, mockDecipher);
      expect(result).toBeInstanceOf(ReadableStream);
    });
  });
});
