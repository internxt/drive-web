import { DatabaseCollection, LRUCacheTypes } from '.';
import { BlobCacheStorage, sharedBlobCache } from './BlobCacheStorage';

const MB_50_IN_BYTES = 52428800;

export class LRUFilesPreviewCacheManager {
  public static readonly getInstance = sharedBlobCache(
    new BlobCacheStorage(
      DatabaseCollection.LevelsBlobsPreviews,
      LRUCacheTypes.LevelsBlobsPreview,
      (record) => record.preview,
    ),
    MB_50_IN_BYTES,
  );
}
