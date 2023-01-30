import { DBSchema } from 'idb';
import configService from '../../../core/services/config.service';
import { DriveItemData } from '../../../drive/types';
import indexedDBService from './indexed-db.service';
import { LRUCacheStruture } from './LRUCache';

export enum DatabaseProvider {
  IndexedDB = 'indexed-db',
}

export enum DatabaseCollection {
  Levels = 'levels',
  Photos = 'photos',
  LevelsBlobs = 'levels_blobs',
  LRU_cache = 'lru_cache',
}

export enum LRUCacheTypes {
  LevelsBlobs = 'levels_blobs',
}

export type DriveItemBlobData = {
  id: number;
  parentId: number;
  preview?: Blob;
  source?: Blob;
  updatedAt?: string;
};

export interface AppDatabase extends DBSchema {
  levels: {
    key: number;
    value: DriveItemData[];
    indexes?: Record<string, IDBValidKey>;
  };
  levels_blobs: {
    key: number;
    value: DriveItemBlobData;
    indexes?: Record<string, IDBValidKey>;
  };
  lru_cache: {
    key: LRUCacheTypes;
    value: LRUCacheStruture;
  };
  photos: {
    key: string;
    value: {
      preview?: Blob;
      source?: Blob;
      indexes?: Record<string, IDBValidKey>;
    };
  };
}

export interface DatabaseService {
  (databaseName: string, databaseVersion: number): {
    put: <Name extends DatabaseCollection>(
      collectionName: Name,
      key: AppDatabase[Name]['key'],
      value: AppDatabase[Name]['value'],
    ) => Promise<void>;
    get: <Name extends DatabaseCollection>(
      collectionName: Name,
      key: AppDatabase[Name]['key'],
    ) => Promise<AppDatabase[Name]['value'] | undefined>;
    clear: () => Promise<void>;
    delete: <Name extends DatabaseCollection>(collectionName: Name, key: AppDatabase[Name]['key']) => Promise<void>;
    getAll: <Name extends keyof AppDatabase>(
      collectionName: DatabaseCollection,
    ) => Promise<AppDatabase[Name]['value'][] | undefined>;
    getAllFromIndex: <Name extends keyof AppDatabase, Index extends keyof AppDatabase[Name]['indexes']>(
      collectionName: DatabaseCollection,
      index: Index,
      key: number,
    ) => Promise<AppDatabase[Name]['value'][] | undefined>;
  };
}

const providers: { [key in DatabaseProvider]: DatabaseService } = {
  [DatabaseProvider.IndexedDB]: indexedDBService,
};
const appConfig = configService.getAppConfig();

export default providers[appConfig.database.provider](appConfig.database.name, appConfig.database.version);
