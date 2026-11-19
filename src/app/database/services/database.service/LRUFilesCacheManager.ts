import { DatabaseCollection, LRUCacheTypes } from '.';
import { BlobCacheStorage, sharedBlobCache } from './BlobCacheStorage';

const MB_450_IN_BYTES = 471859200;

export const createFilesCacheStorage = () =>
  new BlobCacheStorage(DatabaseCollection.LevelsBlobs, LRUCacheTypes.LevelsBlobs, (record) => record.source);

export class LRUFilesCacheManager {
  public static readonly getInstance = sharedBlobCache(createFilesCacheStorage(), MB_450_IN_BYTES);
}
