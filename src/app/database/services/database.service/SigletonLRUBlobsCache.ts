import { ICacheStorage, LRUCache } from './LRUCache';
import databaseService, { DatabaseCollection, DriveItemBlobData } from '.';

class LevelsBlobsCache implements ICacheStorage<DriveItemBlobData> {
  async getSize(key: string): Promise<number> {
    const blobItem = await databaseService.get(DatabaseCollection.LevelsBlobs, parseInt(key));
    return blobItem?.source?.size || 0;
  }
  async get(key: string): Promise<DriveItemBlobData | undefined> {
    const blobItem = await databaseService.get(DatabaseCollection.LevelsBlobs, parseInt(key));
    return blobItem;
  }
  set(key: string, value: DriveItemBlobData): void {
    databaseService.put(DatabaseCollection.LevelsBlobs, parseInt(key), value);
  }
  delete(key: string): void {
    databaseService.delete(DatabaseCollection.LevelsBlobs, parseInt(key));
  }
  async has(key: string): Promise<boolean> {
    const exists = !!(await databaseService.get(DatabaseCollection.LevelsBlobs, parseInt(key)));
    return exists;
  }
}
const MB_450_IN_BYTES = 471859200;

export class SingletonLRUBlob {
  private static instance: LRUCache<DriveItemBlobData>;
  private constructor() {
    //EMPTY constructor
  }

  public static getInstance(): LRUCache<DriveItemBlobData> {
    if (!SingletonLRUBlob.instance) {
      const levelsBlobsCache = new LevelsBlobsCache();
      databaseService.getAll(DatabaseCollection.LevelsBlobs).then((allBlobs) => {
        if (allBlobs) {
          const blobsKeys = (allBlobs as DriveItemBlobData[])?.map((blobItem) => blobItem.id.toString());
          const size = (allBlobs as DriveItemBlobData[])?.reduce((acc, blob) => acc + (blob?.source?.size || 0), 0);
          SingletonLRUBlob.instance = new LRUCache<DriveItemBlobData>(levelsBlobsCache, MB_450_IN_BYTES, {
            lruKeyList: blobsKeys,
            itemsListSize: size,
          });
        } else {
          SingletonLRUBlob.instance = new LRUCache<DriveItemBlobData>(levelsBlobsCache, MB_450_IN_BYTES);
        }
      });
    }
    return SingletonLRUBlob.instance;
  }
}
