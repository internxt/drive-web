import { describe, expect, test } from 'vitest';
import { LRUPhotosThumbnailsCacheManager } from './LRUPhotosThumbnailsCacheManager';

describe('Photos thumbnails cache', () => {
  test(
    'When many photos ask for the cache at the same time, then they all share the same cache',
    { retry: 0 },
    async () => {
      const [firstPhotoCache, secondPhotoCache, thirdPhotoCache] = await Promise.all([
        LRUPhotosThumbnailsCacheManager.getInstance(),
        LRUPhotosThumbnailsCacheManager.getInstance(),
        LRUPhotosThumbnailsCacheManager.getInstance(),
      ]);

      expect(secondPhotoCache).toBe(firstPhotoCache);
      expect(thirdPhotoCache).toBe(firstPhotoCache);
    },
  );
});
