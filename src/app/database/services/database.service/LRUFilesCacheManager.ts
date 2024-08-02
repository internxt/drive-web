import databaseService, { DatabaseCollection, DriveItemBlobData, LRUCacheTypes } from '.';
import { ICacheStorage, LRUCache, LRUCacheStruture } from './LRUCache';

class LevelsBlobsCache implements ICacheStorage<DriveItemBlobData> {
  async getSize(key: string): Promise<number> {
    const blobItem = await databaseService.get(DatabaseCollection.LevelsBlobs, key);
    return blobItem?.source?.size || 0;
  }

  get(key: string): Promise<DriveItemBlobData | undefined> {
    const blobItem = databaseService.get(DatabaseCollection.LevelsBlobs, key);
    return blobItem;
  }

  set(key: string, value: DriveItemBlobData): void {
    databaseService.put(DatabaseCollection.LevelsBlobs, key, value);
  }

  delete(key: string): void {
    databaseService.get(DatabaseCollection.LevelsBlobs, key).then((databaseData) => {
      if (databaseData?.preview) {
        databaseService.put(DatabaseCollection.LevelsBlobs, key, { ...databaseData, source: undefined });
        return;
      }
      databaseService.delete(DatabaseCollection.LevelsBlobs, key);
    });
  }

  async has(key: string): Promise<boolean> {
    const exists = !!(await databaseService.get(DatabaseCollection.LevelsBlobs, key))?.source;
    return exists;
  }

  updateLRUState(lruState: LRUCacheStruture): void {
    databaseService.put(DatabaseCollection.LRU_cache, LRUCacheTypes.LevelsBlobs, lruState);
  }
}

const MB_450_IN_BYTES = 471859200;

export class LRUFilesCacheManager {
  private static instance: LRUCache<DriveItemBlobData>;

  public static async getInstance(): Promise<LRUCache<DriveItemBlobData>> {
    if (!LRUFilesCacheManager.instance) {
      const levelsBlobsCache = new LevelsBlobsCache();

      const lruCacheState = await databaseService.get(DatabaseCollection.LRU_cache, LRUCacheTypes.LevelsBlobs);
      if (lruCacheState) {
        LRUFilesCacheManager.instance = new LRUCache<DriveItemBlobData>(levelsBlobsCache, MB_450_IN_BYTES, {
          lruKeyList: lruCacheState.lruKeyList,
          itemsListSize: lruCacheState.itemsListSize,
        });
      } else {
        LRUFilesCacheManager.instance = new LRUCache<DriveItemBlobData>(levelsBlobsCache, MB_450_IN_BYTES);
      }
    }
    return LRUFilesCacheManager.instance;
  }
}
