import { ICacheStorage, LRUCache, LRUCacheStruture } from './LRUCache';
import databaseService, { DatabaseCollection, PhotosData, LRUCacheTypes } from '.';

class PhotosPreviewsCache implements ICacheStorage<PhotosData> {
  async getSize(key: string): Promise<number> {
    const blobItem = await databaseService.get(DatabaseCollection.Photos, key);
    return blobItem?.preview?.size || 0;
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
      if (databaseData?.source) {
        databaseService.put(DatabaseCollection.Photos, key, { ...databaseData, preview: undefined });
        return;
      }
      databaseService.delete(DatabaseCollection.Photos, key);
    });
  }

  async has(key: string): Promise<boolean> {
    const exists = !!(await databaseService.get(DatabaseCollection.Photos, key))?.preview;
    return exists;
  }

  updateLRUState(lruState: LRUCacheStruture): void {
    databaseService.put(DatabaseCollection.LRU_cache, LRUCacheTypes.PhotosPreview, lruState);
  }
}

const MB_100_IN_BYTES = 104857600;

export class LRUPhotosPreviewsCacheManager {
  private static instance: LRUCache<PhotosData>;

  public static getInstance(): LRUCache<PhotosData> {
    if (!LRUPhotosPreviewsCacheManager.instance) {
      const photosPreviewCache = new PhotosPreviewsCache();

      databaseService.get(DatabaseCollection.LRU_cache, LRUCacheTypes.PhotosPreview).then((lruCacheState) => {
        if (lruCacheState) {
          LRUPhotosPreviewsCacheManager.instance = new LRUCache<PhotosData>(photosPreviewCache, MB_100_IN_BYTES, {
            lruKeyList: lruCacheState.lruKeyList,
            itemsListSize: lruCacheState.itemsListSize,
          });
        } else {
          LRUPhotosPreviewsCacheManager.instance = new LRUCache<PhotosData>(photosPreviewCache, MB_100_IN_BYTES);
        }
      });
    }
    return LRUPhotosPreviewsCacheManager.instance;
  }
}
