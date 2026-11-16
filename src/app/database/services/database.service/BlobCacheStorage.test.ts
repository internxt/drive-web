import { describe, expect, test, vi } from 'vitest';
import databaseService, { DatabaseCollection, LRUCacheTypes } from '.';
import { BlobCacheStorage, sharedBlobCache } from './BlobCacheStorage';
import { LRUCache } from './LRUCache';
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

  test('When the cache cannot be loaded, then the next request tries to load it again', async () => {
    const loadError = new Error('Database unavailable');
    const getSpy = vi.spyOn(databaseService, 'get').mockRejectedValueOnce(loadError);
    const getCache = sharedBlobCache(
      new BlobCacheStorage(DatabaseCollection.LevelsBlobsPreviews, LRUCacheTypes.LevelsBlobsPreview, (r) => r.preview),
      100,
    );

    try {
      await expect(getCache()).rejects.toBe(loadError);
      await expect(getCache()).resolves.toBeInstanceOf(LRUCache);
    } finally {
      getSpy.mockRestore();
    }
  });
});
