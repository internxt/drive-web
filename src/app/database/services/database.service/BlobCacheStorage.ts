import errorService from 'services/error.service';
import databaseService, { AppDatabase, DatabaseCollection, LRUCacheTypes } from '.';
import { ICacheStorage, LRUCache, LRUCacheStruture } from './LRUCache';

type BlobCollection =
  | DatabaseCollection.LevelsBlobs
  | DatabaseCollection.LevelsBlobsPreviews
  | DatabaseCollection.PhotosThumbnails;

type BlobRecord<Name extends BlobCollection> = AppDatabase[Name]['value'];

/**
 * Keeps each cached blob in its own record of its own store, so caches never
 * overwrite each other's blobs or versions.
 */
export class BlobCacheStorage<Name extends BlobCollection> implements ICacheStorage<BlobRecord<Name>> {
  constructor(
    private readonly collection: Name,
    readonly lruType: LRUCacheTypes,
    private readonly blobOf: (record: BlobRecord<Name>) => Blob | undefined,
  ) {}

  async getSize(key: string): Promise<number> {
    const record = await this.get(key);
    return (record && this.blobOf(record)?.size) ?? 0;
  }

  get(key: string): Promise<BlobRecord<Name> | undefined> {
    return databaseService.get(this.collection, key);
  }

  set(key: string, value: BlobRecord<Name>): Promise<void> {
    return databaseService.put(this.collection, key, value);
  }

  delete(key: string): void {
    databaseService.delete(this.collection, key).catch(errorService.reportError);
  }

  async has(key: string): Promise<boolean> {
    const record = await this.get(key);
    return !!record && !!this.blobOf(record);
  }

  updateLRUState(lruState: LRUCacheStruture): void {
    databaseService.put(DatabaseCollection.LRU_cache, this.lruType, lruState).catch(errorService.reportError);
  }
}

/**
 * Returns a getter that builds the cache once, even when many callers ask for it at the same time.
 */
export const sharedBlobCache = <Name extends BlobCollection>(
  storage: BlobCacheStorage<Name>,
  maxSize: number,
): (() => Promise<LRUCache<BlobRecord<Name>>>) => {
  let instance: Promise<LRUCache<BlobRecord<Name>>> | undefined;

  const createCache = async () => {
    const lruCacheState = await databaseService.get(DatabaseCollection.LRU_cache, storage.lruType);
    return new LRUCache(storage, maxSize, lruCacheState);
  };

  return () => {
    instance ??= createCache().catch((error) => {
      instance = undefined;
      throw error;
    });
    return instance;
  };
};
