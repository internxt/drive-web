import errorService from 'services/error.service';
import databaseService, { DatabaseCollection, LRUCacheTypes, PhotoThumbnailBlobData } from '.';
import { ICacheStorage, LRUCache, LRUCacheStruture } from './LRUCache';

class PhotosThumbnailsCache implements ICacheStorage<PhotoThumbnailBlobData> {
  async getSize(key: string): Promise<number> {
    const thumbnail = await databaseService.get(DatabaseCollection.PhotosThumbnails, key);
    return thumbnail?.preview.size ?? 0;
  }

  get(key: string): Promise<PhotoThumbnailBlobData | undefined> {
    return databaseService.get(DatabaseCollection.PhotosThumbnails, key);
  }

  set(key: string, value: PhotoThumbnailBlobData): void {
    databaseService.put(DatabaseCollection.PhotosThumbnails, key, value).catch(errorService.reportError);
  }

  delete(key: string): void {
    databaseService.delete(DatabaseCollection.PhotosThumbnails, key).catch(errorService.reportError);
  }

  async has(key: string): Promise<boolean> {
    const exists = !!(await databaseService.get(DatabaseCollection.PhotosThumbnails, key));
    return exists;
  }

  updateLRUState(lruState: LRUCacheStruture): void {
    databaseService
      .put(DatabaseCollection.LRU_cache, LRUCacheTypes.PhotosThumbnails, lruState)
      .catch(errorService.reportError);
  }
}

const MB_200_IN_BYTES = 200 * 1024 * 1024;

export class LRUPhotosThumbnailsCacheManager {
  private static instance: LRUCache<PhotoThumbnailBlobData>;

  public static async getInstance(): Promise<LRUCache<PhotoThumbnailBlobData>> {
    if (!LRUPhotosThumbnailsCacheManager.instance) {
      const lruCacheState = await databaseService.get(DatabaseCollection.LRU_cache, LRUCacheTypes.PhotosThumbnails);
      LRUPhotosThumbnailsCacheManager.instance = new LRUCache(
        new PhotosThumbnailsCache(),
        MB_200_IN_BYTES,
        lruCacheState,
      );
    }
    return LRUPhotosThumbnailsCacheManager.instance;
  }
}
