import { describe, it, expect, vi, beforeEach, test } from 'vitest';

import crypto from 'node:crypto';
import {
  decryptStream,
  binaryStreamToBlob,
  binaryStreamToUint8Array,
  buildProgressStream,
  joinReadableBinaryStreams,
} from './stream.service';
import { getDecryptedStream } from 'app/network/download';

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
    mockInputSlices = [
      new ReadableStream({
        start(controller) {
          controller.close();
        },
      }),
    ];
  });

  describe('binaryStreamToBlob', () => {
    it('should convert a binary stream to a blob without mime type', async () => {
      const mockData = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])];
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          for (const chunk of mockData) {
            controller.enqueue(chunk);
          }
          controller.close();
        },
      });

      const blob = await binaryStreamToBlob(stream);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBe(6);
      expect(blob.type).toBe('');
    });

    it('should convert a binary stream to a blob with mime type', async () => {
      const mockData = [new Uint8Array([1, 2, 3])];
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          for (const chunk of mockData) {
            controller.enqueue(chunk);
          }
          controller.close();
        },
      });

      const blob = await binaryStreamToBlob(stream, 'image/png');

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBe(3);
      expect(blob.type).toBe('image/png');
    });

    it('should handle empty stream', async () => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.close();
        },
      });

      const blob = await binaryStreamToBlob(stream);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBe(0);
    });
  });

  describe('Convert binary stream to uint8Array', () => {
    test('When converting a binary stream with multiple chunks, then it returns a combined Uint8Array', async () => {
      const mockData = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])];
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          for (const chunk of mockData) {
            controller.enqueue(chunk);
          }
          controller.close();
        },
      });

      const result = await binaryStreamToUint8Array(stream);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(6);
      expect(Array.from(result)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    test('When converting a binary stream with a single chunk, then it returns a Uint8Array', async () => {
      const mockData = [new Uint8Array([1, 2, 3])];
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          for (const chunk of mockData) {
            controller.enqueue(chunk);
          }
          controller.close();
        },
      });

      const result = await binaryStreamToUint8Array(stream);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(3);
      expect(Array.from(result)).toEqual([1, 2, 3]);
    });

    test('When converting an empty stream, then it returns an empty Uint8Array', async () => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.close();
        },
      });

      const result = await binaryStreamToUint8Array(stream);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(0);
    });

    test('When a function to read the bytes is provided, then it tracks progress with accumulated bytes', async () => {
      const mockData = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5]), new Uint8Array([6, 7, 8, 9])];
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          for (const chunk of mockData) {
            controller.enqueue(chunk);
          }
          controller.close();
        },
      });

      const onRead = vi.fn();
      const result = await binaryStreamToUint8Array(stream, onRead);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(9);
      expect(Array.from(result)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);

      expect(onRead).toHaveBeenCalledTimes(3);
      expect(onRead).toHaveBeenNthCalledWith(1, 3);
      expect(onRead).toHaveBeenNthCalledWith(2, 5);
      expect(onRead).toHaveBeenNthCalledWith(3, 9);
    });

    test('When a function to read the bytes is not provided, then the stream is processed normally', async () => {
      const mockData = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])];
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          for (const chunk of mockData) {
            controller.enqueue(chunk);
          }
          controller.close();
        },
      });

      const result = await binaryStreamToUint8Array(stream);

      expect(result).toBeInstanceOf(Uint8Array);
      expect(result.length).toBe(6);
      expect(Array.from(result)).toEqual([1, 2, 3, 4, 5, 6]);
    });
  });

  describe('buildProgressStream', () => {
    it('should track progress as data is read from the stream', async () => {
      const mockData = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5])];
      const sourceStream = new ReadableStream<Uint8Array>({
        start(controller) {
          for (const chunk of mockData) {
            controller.enqueue(chunk);
          }
          controller.close();
        },
      });

      const onRead = vi.fn();
      const progressStream = buildProgressStream(sourceStream, onRead);
      const reader = progressStream.getReader();

      await reader.read();
      expect(onRead).toHaveBeenCalledWith(3);

      await reader.read();
      expect(onRead).toHaveBeenCalledWith(5);

      const { done } = await reader.read();
      expect(done).toBe(true);
    });

    it('should handle stream cancellation', async () => {
      const sourceStream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3]));
        },
      });

      const onRead = vi.fn();
      const progressStream = buildProgressStream(sourceStream, onRead);
      const reader = progressStream.getReader();

      await reader.cancel();

      expect(onRead).not.toHaveBeenCalled();
    });

    it('should accumulate read bytes across multiple chunks', async () => {
      const mockData = [new Uint8Array([1, 2]), new Uint8Array([3, 4, 5]), new Uint8Array([6])];
      const sourceStream = new ReadableStream<Uint8Array>({
        start(controller) {
          for (const chunk of mockData) {
            controller.enqueue(chunk);
          }
          controller.close();
        },
      });

      const onRead = vi.fn();
      const progressStream = buildProgressStream(sourceStream, onRead);
      const reader = progressStream.getReader();

      await reader.read();
      expect(onRead).toHaveBeenCalledWith(2);

      await reader.read();
      expect(onRead).toHaveBeenCalledWith(5);

      await reader.read();
      expect(onRead).toHaveBeenCalledWith(6);
    });
  });

  describe('joinReadableBinaryStreams', () => {
    it('should join multiple streams into one', async () => {
      const stream1 = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2]));
          controller.close();
        },
      });

      const stream2 = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([3, 4]));
          controller.close();
        },
      });

      const joinedStream = joinReadableBinaryStreams([stream1, stream2]);
      const reader = joinedStream.getReader();

      const chunk1 = await reader.read();
      expect(chunk1.done).toBe(false);
      expect(chunk1.value).toEqual(new Uint8Array([1, 2]));

      const chunk2 = await reader.read();
      expect(chunk2.done).toBe(false);
      expect(chunk2.value).toEqual(new Uint8Array([3, 4]));

      const chunk3 = await reader.read();
      expect(chunk3.done).toBe(true);
    });

    it('should handle empty streams array', async () => {
      const joinedStream = joinReadableBinaryStreams([]);
      const reader = joinedStream.getReader();

      const result = await reader.read();
      expect(result.done).toBe(true);
    });

    it('should handle stream with multiple chunks', async () => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([1]));
          controller.enqueue(new Uint8Array([2]));
          controller.enqueue(new Uint8Array([3]));
          controller.close();
        },
      });

      const joinedStream = joinReadableBinaryStreams([stream]);
      const reader = joinedStream.getReader();

      const chunks: Uint8Array[] = [];
      let result = await reader.read();

      while (!result.done) {
        chunks.push(result.value as Uint8Array);
        result = await reader.read();
      }

      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toEqual(new Uint8Array([1]));
      expect(chunks[1]).toEqual(new Uint8Array([2]));
      expect(chunks[2]).toEqual(new Uint8Array([3]));
    });

    it('should handle stream cancellation', async () => {
      const stream1 = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2]));
        },
      });

      const stream2 = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([3, 4]));
        },
      });

      const joinedStream = joinReadableBinaryStreams([stream1, stream2]);
      const reader = joinedStream.getReader();

      await reader.cancel();

      const result = await reader.read();
      expect(result.done).toBe(true);
    });
  });

  describe('decryptStream', () => {
    test('should proceed with standard decryption when there is no offset', () => {
      const createDecipherivSpy = vi.spyOn(crypto, 'createDecipheriv').mockReturnValue(mockDecipher);

      const result = decryptStream(mockInputSlices, mockKey, mockIv);

      expect(createDecipherivSpy).toHaveBeenCalledWith('aes-256-ctr', mockKey, mockIv);
      expect(mockDecipher.update).not.toHaveBeenCalled();
      expect(getDecryptedStream).toHaveBeenCalledWith(mockInputSlices, mockDecipher);
      expect(result).toBeInstanceOf(ReadableStream);
    });

    it('should calculate a new IV and skip the buffer when there is an offset', () => {
      const startOffsetByte = 20;

      const ivBigInt = BigInt('0x' + mockIv.toString('hex'));
      const expectedNewIvHex = (ivBigInt + BigInt(1)).toString(16).padStart(32, '0');
      const expectedNewIv = Buffer.from(expectedNewIvHex, 'hex');
      const expectedSkipBuffer = Buffer.alloc(4, 0);
      const createDecipherivSpy = vi.spyOn(crypto, 'createDecipheriv').mockReturnValue(mockDecipher);

      const result = decryptStream(mockInputSlices, mockKey, mockIv, startOffsetByte);

      expect(createDecipherivSpy).toHaveBeenCalledWith('aes-256-ctr', mockKey, expectedNewIv);
      expect(mockDecipher.update).toHaveBeenCalledWith(expectedSkipBuffer);
      expect(getDecryptedStream).toHaveBeenCalledWith(mockInputSlices, mockDecipher);
      expect(result).toBeInstanceOf(ReadableStream);
    });

    it('should handle offset that is a multiple of AES block size', () => {
      const startOffsetByte = 32; // 2 blocks of 16 bytes
      const aesBlockSize = 16;

      const ivBigInt = BigInt('0x' + mockIv.toString('hex'));
      const startBlockNumber = startOffsetByte / aesBlockSize;
      const expectedNewIvHex = (ivBigInt + BigInt(startBlockNumber)).toString(16).padStart(32, '0');
      const expectedNewIv = Buffer.from(expectedNewIvHex, 'hex');
      const expectedSkipBuffer = Buffer.alloc(0, 0);
      const createDecipherivSpy = vi.spyOn(crypto, 'createDecipheriv').mockReturnValue(mockDecipher);

      const result = decryptStream(mockInputSlices, mockKey, mockIv, startOffsetByte);

      expect(createDecipherivSpy).toHaveBeenCalledWith('aes-256-ctr', mockKey, expectedNewIv);
      expect(mockDecipher.update).toHaveBeenCalledWith(expectedSkipBuffer);
      expect(getDecryptedStream).toHaveBeenCalledWith(mockInputSlices, mockDecipher);
      expect(result).toBeInstanceOf(ReadableStream);
    });

    it('should handle offset of 0', () => {
      const createDecipherivSpy = vi.spyOn(crypto, 'createDecipheriv').mockReturnValue(mockDecipher);

      const result = decryptStream(mockInputSlices, mockKey, mockIv, 0);

      expect(createDecipherivSpy).toHaveBeenCalledWith('aes-256-ctr', mockKey, mockIv);
      expect(mockDecipher.update).not.toHaveBeenCalled();
      expect(getDecryptedStream).toHaveBeenCalledWith(mockInputSlices, mockDecipher);
      expect(result).toBeInstanceOf(ReadableStream);
    });
  });
});
