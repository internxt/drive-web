import { DBSchema } from 'idb';
import configService from '../../../core/services/config.service';
import { DriveItemData } from '../../../drive/types';
import { TaskStatus } from '../../../tasks/types';
import { LRUCacheStruture } from './LRUCache';
import indexedDBService from './indexed-db.service';

export enum DatabaseProvider {
  IndexedDB = 'indexed-db',
}

export enum DatabaseCollection {
  Levels = 'levels',
  MoveDialogLevels = 'move_levels',
  LevelsBlobs = 'levels_blobs',
  LRU_cache = 'lru_cache',
  Account_settings = 'account_settings',
  UploadItemStatus = 'upload_item_status',
  WorkspacesAvatarBlobs = 'workspaces_avatar_blobs',
}

export enum LRUCacheTypes {
  LevelsBlobs = 'levels_blobs',
  LevelsBlobsPreview = 'levels_blobs_preview',
}

export type DriveItemBlobData = {
  id: number;
  parentId: number;
  preview?: Blob;
  source?: Blob;
  updatedAt?: string;
};

export type AvatarBlobData = {
  srcURL: string;
  avatarBlob: Blob;
  uuid: string;
};

export interface AppDatabase extends DBSchema {
  levels: {
    key: string;
    value: DriveItemData[];
    indexes?: Record<string, IDBValidKey>;
  };
  move_levels: {
    key: string;
    value: DriveItemData[];
    indexes?: Record<string, IDBValidKey>;
  };
  levels_blobs: {
    key: string;
    value: DriveItemBlobData;
    indexes?: Record<string, IDBValidKey>;
  };
  lru_cache: {
    key: LRUCacheTypes;
    value: LRUCacheStruture;
  };
  account_settings: {
    key: string;
    value: AvatarBlobData;
  };
  upload_item_status: {
    key: string;
    value: TaskStatus;
  };
  workspaces_avatar_blobs: {
    key: string;
    value: AvatarBlobData;
  };
}

export type DatabaseService = (
  databaseName: string,
  databaseVersion: number,
) => {
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
  isAvailable: () => Promise<boolean>;
};

const providers: { [key in DatabaseProvider]: DatabaseService } = {
  [DatabaseProvider.IndexedDB]: indexedDBService,
};
const appConfig = configService.getAppConfig();

export default providers[appConfig.database.provider](appConfig.database.name, appConfig.database.version);
