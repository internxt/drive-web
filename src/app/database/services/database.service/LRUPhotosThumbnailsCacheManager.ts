import { DatabaseCollection, LRUCacheTypes } from '.';
import { BlobCacheStorage, sharedBlobCache } from './BlobCacheStorage';

const MB_200_IN_BYTES = 200 * 1024 * 1024;

export class LRUPhotosThumbnailsCacheManager {
  public static readonly getInstance = sharedBlobCache(
    new BlobCacheStorage(
      DatabaseCollection.PhotosThumbnails,
      LRUCacheTypes.PhotosThumbnails,
      (record) => record.preview,
    ),
    MB_200_IN_BYTES,
  );
}
