import databaseService, { DatabaseCollection, DriveItemBlobData, LRUCacheTypes } from '.';
import { ICacheStorage, LRUCache, LRUCacheStruture } from './LRUCache';

class LevelsBlobsPreviewsCache implements ICacheStorage<DriveItemBlobData> {
  async getSize(key: string): Promise<number> {
    const blobItem = await databaseService.get(DatabaseCollection.LevelsBlobs, key);
    return blobItem?.preview?.size ?? 0;
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
      if (databaseData?.source) {
        databaseService.put(DatabaseCollection.LevelsBlobs, key, { ...databaseData, preview: undefined });
        return;
      }
      databaseService.delete(DatabaseCollection.LevelsBlobs, key);
    });
  }

  async has(key: string): Promise<boolean> {
    const exists = !!(await databaseService.get(DatabaseCollection.LevelsBlobs, key))?.preview;
    return exists;
  }

  updateLRUState(lruState: LRUCacheStruture): void {
    databaseService.put(DatabaseCollection.LRU_cache, LRUCacheTypes.LevelsBlobsPreview, lruState);
  }
}

const MB_50_IN_BYTES = 52428800;

export class LRUFilesPreviewCacheManager {
  private static instance: LRUCache<DriveItemBlobData>;

  public static async getInstance(): Promise<LRUCache<DriveItemBlobData>> {
    if (!LRUFilesPreviewCacheManager.instance) {
      const levelsBlobsCache = new LevelsBlobsPreviewsCache();

      const lruCacheState = await databaseService.get(DatabaseCollection.LRU_cache, LRUCacheTypes.LevelsBlobsPreview);
      if (lruCacheState) {
        LRUFilesPreviewCacheManager.instance = new LRUCache<DriveItemBlobData>(levelsBlobsCache, MB_50_IN_BYTES, {
          lruKeyList: lruCacheState.lruKeyList,
          itemsListSize: lruCacheState.itemsListSize,
        });
      } else {
        LRUFilesPreviewCacheManager.instance = new LRUCache<DriveItemBlobData>(levelsBlobsCache, MB_50_IN_BYTES);
      }
    }
    return LRUFilesPreviewCacheManager.instance;
  }
}
