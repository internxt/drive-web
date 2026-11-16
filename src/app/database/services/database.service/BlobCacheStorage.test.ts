import { describe, expect, test } from 'vitest';
import { LRUFilesCacheManager } from './LRUFilesCacheManager';
import { LRUFilesPreviewCacheManager } from './LRUFilesPreviewCacheManager';
import { LRUPhotosThumbnailsCacheManager } from './LRUPhotosThumbnailsCacheManager';

describe('Blob caches', () => {
  test.each([
    ['Drive files', LRUFilesCacheManager],
    ['Drive previews', LRUFilesPreviewCacheManager],
    ['Photos thumbnails', LRUPhotosThumbnailsCacheManager],
  ])(
    'When many callers ask for the %s cache at the same time, then they all share the same cache',
    { retry: 0 },
    async (_, manager) => {
      const [firstCache, secondCache, thirdCache] = await Promise.all([
        manager.getInstance(),
        manager.getInstance(),
        manager.getInstance(),
      ]);

      expect(secondCache).toBe(firstCache);
      expect(thirdCache).toBe(firstCache);
    },
  );
});
