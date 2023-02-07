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
  Account_settings = 'account_settings',
}

export enum LRUCacheTypes {
  LevelsBlobs = 'levels_blobs',
  LevelsBlobsPreview = 'levels_blobs_preview',
  PhotosPreview = 'photos_preview',
  PhotosSource = 'photos_source',
}

export type DriveItemBlobData = {
  id: number;
  parentId: number;
  preview?: Blob;
  source?: Blob;
  updatedAt?: string;
};

export type PhotosData = {
  preview?: Blob;
  source?: Blob;
};

export type AvatarBlobData = {
  srcURL: string;
  avatarBlob: Blob;
  uuid: string;
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
    value: PhotosData;
    indexes?: Record<string, IDBValidKey>;
  };
  account_settings: {
    key: string;
    value: AvatarBlobData;
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
