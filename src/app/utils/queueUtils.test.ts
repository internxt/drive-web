import { describe, expect, test } from 'vitest';
import { QueueUtilsService } from './queueUtils';

describe('Testing Queue Utils', () => {
  describe('Calculating the optimal chunks', () => {
    const HUNDRED_MB = 100 * 1024 * 1024;
    const FIFTY_MB = 50 * 1024 * 1024;

    test('When the file is smaller than 100MB, then return no chunking (concurrency 1)', () => {
      const fileSize = 80 * 1024 * 1024;
      const result = QueueUtilsService.instance.calculateChunkSizeAndConcurrency(fileSize);

      expect(result).toStrictEqual({
        chunkSize: fileSize,
        concurrency: 1,
      });
    });

    test('When the file is between 100MB and 500MB, then return chunks with concurrency of 6', () => {
      const fileSize = 300 * 1024 * 1024;
      const result = QueueUtilsService.instance.calculateChunkSizeAndConcurrency(fileSize);

      expect(result).toStrictEqual({
        chunkSize: FIFTY_MB,
        concurrency: 6,
      });
    });

    test('When the file is between 500MB and 2GB, then return chunks of 100MB and concurrency of 10', () => {
      const fileSize = 1.5 * 1024 * 1024 * 1024;
      const result = QueueUtilsService.instance.calculateChunkSizeAndConcurrency(fileSize);

      const expectedChunkSize = Math.ceil(fileSize / 16);

      expect(result).toStrictEqual({
        chunkSize: expectedChunkSize,
        concurrency: 10,
      });
    });

    test('When the file is bigger than 2GB, then return chunks of 100MB and concurrency of 16', () => {
      const fileSize = 3.5 * 1024 * 1024 * 1024;
      const result = QueueUtilsService.instance.calculateChunkSizeAndConcurrency(fileSize);

      const expectedChunkSize = Math.ceil(fileSize / 36);

      expect(result).toStrictEqual({
        chunkSize: expectedChunkSize,
        concurrency: 16,
      });
    });

    test('When the file is 10GB, then return chunks of 100MB and concurrency of 16', () => {
      const fileSize = 10 * 1024 * 1024 * 1024;
      const result = QueueUtilsService.instance.calculateChunkSizeAndConcurrency(fileSize);

      const expectedChunkSize = Math.ceil(fileSize / 103);

      expect(result).toStrictEqual({
        chunkSize: expectedChunkSize,
        concurrency: 16,
      });
    });
  });
});
