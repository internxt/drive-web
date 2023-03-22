import { ICacheStorage, LRUCache, LRUCacheStruture } from './LRUCache';
import databaseService, { DatabaseCollection, DriveItemBlobData, LRUCacheTypes } from '.';

class LevelsBlobsPreviewsCache implements ICacheStorage<DriveItemBlobData> {
  async getSize(key: string): Promise<number> {
    const blobItem = await databaseService.get(DatabaseCollection.LevelsBlobs, parseInt(key));
    return blobItem?.preview?.size || 0;
  }

  get(key: string): Promise<DriveItemBlobData | undefined> {
    const blobItem = databaseService.get(DatabaseCollection.LevelsBlobs, parseInt(key));
    return blobItem;
  }

  set(key: string, value: DriveItemBlobData): void {
    databaseService.put(DatabaseCollection.LevelsBlobs, parseInt(key), value);
  }

  delete(key: string): void {
    databaseService.get(DatabaseCollection.LevelsBlobs, parseInt(key)).then((databaseData) => {
      if (databaseData?.source) {
        databaseService.put(DatabaseCollection.LevelsBlobs, parseInt(key), { ...databaseData, preview: undefined });
        return;
      }
      databaseService.delete(DatabaseCollection.LevelsBlobs, parseInt(key));
    });
  }

  async has(key: string): Promise<boolean> {
    const exists = !!(await databaseService.get(DatabaseCollection.LevelsBlobs, parseInt(key)))?.preview;
    return exists;
  }

  updateLRUState(lruState: LRUCacheStruture): void {
    databaseService.put(DatabaseCollection.LRU_cache, LRUCacheTypes.LevelsBlobsPreview, lruState);
  }
}

const MB_50_IN_BYTES = 52428800;

export class LRUFilesPreviewCacheManager {
  private static instance: LRUCache<DriveItemBlobData>;

  public static async getInstance(): Promise<LRUCache<DriveItemBlobData> | null> {
    if (!LRUFilesPreviewCacheManager.instance) {
      const dbIsAvailable = await databaseService.isAvailable();
      if (!dbIsAvailable) return null;
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
