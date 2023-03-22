import { ICacheStorage, LRUCache, LRUCacheStruture } from './LRUCache';
import databaseService, { DatabaseCollection, PhotosData, LRUCacheTypes } from '.';

class PhotosCache implements ICacheStorage<PhotosData> {
  async getSize(key: string): Promise<number> {
    const blobItem = await databaseService.get(DatabaseCollection.Photos, key);
    return blobItem?.source?.size || 0;
  }

  get(key: string): Promise<PhotosData | undefined> {
    const blobItem = databaseService.get(DatabaseCollection.Photos, key);
    return blobItem;
  }

  set(key: string, value: PhotosData): void {
    databaseService.put(DatabaseCollection.Photos, key, value);
  }

  delete(key: string): void {
    databaseService.get(DatabaseCollection.Photos, key).then((databaseData) => {
      if (databaseData?.preview) {
        databaseService.put(DatabaseCollection.Photos, key, { ...databaseData, source: undefined });
        return;
      }
      databaseService.delete(DatabaseCollection.Photos, key);
    });
  }

  async has(key: string): Promise<boolean> {
    const exists = !!(await databaseService.get(DatabaseCollection.Photos, key))?.source;
    return exists;
  }

  updateLRUState(lruState: LRUCacheStruture): void {
    databaseService.put(DatabaseCollection.LRU_cache, LRUCacheTypes.PhotosSource, lruState);
  }
}

const MB_400_IN_BYTES = 419430400;

export class LRUPhotosCacheManager {
  private static instance: LRUCache<PhotosData>;

  public static async getInstance(): Promise<LRUCache<PhotosData> | null> {
    if (!LRUPhotosCacheManager.instance) {
      const dbIsAvailable = await databaseService.isAvailable();
      if (!dbIsAvailable) return null;
      const photosCache = new PhotosCache();

      const lruCacheState = await databaseService.get(DatabaseCollection.LRU_cache, LRUCacheTypes.PhotosSource);
      if (lruCacheState) {
        LRUPhotosCacheManager.instance = new LRUCache<PhotosData>(photosCache, MB_400_IN_BYTES, {
          lruKeyList: lruCacheState.lruKeyList,
          itemsListSize: lruCacheState.itemsListSize,
        });
      } else {
        LRUPhotosCacheManager.instance = new LRUCache<PhotosData>(photosCache, MB_400_IN_BYTES);
      }
    }
    return LRUPhotosCacheManager.instance;
  }
}
