import { describe, expect, test } from 'vitest';

import { QueueUtilsService } from './queueUtils';

describe('Testing Queue Utils', () => {
  describe('Calculating the optimal chunks', () => {
    const FIFTY_MB = 50 * 1024 * 1024;

    test('When the file is smaller than 0.5GB, then return chunks of 50MB and concurrency of 4', () => {
      const fileSize = 0.3 * 1024 * 1024 * 1024;
      const result = QueueUtilsService.instance.calculateChunkSizeAndConcurrency(fileSize);

      expect(result).toStrictEqual({
        chunkSize: fileSize,
        concurrency: 1,
      });
    });

    test('When the file is smaller than 2GB, then return chunks of 25MB and concurrency of 4', () => {
      const fileSize = 1.5 * 1024 * 1024 * 1024;
      const result = QueueUtilsService.instance.calculateChunkSizeAndConcurrency(fileSize);

      expect(result).toStrictEqual({
        chunkSize: FIFTY_MB,
        concurrency: 6,
      });
    });

    test('When the file is bigger than 2GB and smaller than 5GB, then return chunks of 15MB and concurrency of 3', () => {
      const fileSize = 3.5 * 1024 * 1024 * 1024;
      const result = QueueUtilsService.instance.calculateChunkSizeAndConcurrency(fileSize);

      expect(result).toStrictEqual({
        chunkSize: FIFTY_MB,
        concurrency: 6,
      });
    });

    test('When the file is bigger than 5GB and smaller than 10GB, then return chunks of 10MB and concurrency of 2', () => {
      const fileSize = 8.5 * 1024 * 1024 * 1024;
      const result = QueueUtilsService.instance.calculateChunkSizeAndConcurrency(fileSize);

      expect(result).toStrictEqual({
        chunkSize: FIFTY_MB,
        concurrency: 6,
      });
    });

    test('When the file is bigger than 10GB, then return chunks of 5MB and concurrency of 2', () => {
      const fileSize = 15 * 1024 * 1024 * 1024;
      const result = QueueUtilsService.instance.calculateChunkSizeAndConcurrency(fileSize);

      expect(result).toStrictEqual({
        chunkSize: FIFTY_MB,
        concurrency: 6,
      });
    });
  });
});
