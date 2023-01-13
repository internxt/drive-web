import { DBSchema } from 'idb';
import configService from '../../../core/services/config.service';
import { DriveItemData } from '../../../drive/types';
import indexedDBService from './indexed-db.service';

export enum DatabaseProvider {
  IndexedDB = 'indexed-db',
}

export enum DatabaseCollection {
  Levels = 'levels',
  Photos = 'photos',
  LevelsBlobs = 'levels_blobs',
}

export interface AppDatabase extends DBSchema {
  levels: {
    key: number;
    value: DriveItemData[];
  };
  levels_blobs: {
    key: number;
    value: {
      id: number;
      preview?: Blob;
      source?: Blob;
      updatedAt?: string;
    }[];
  };
  photos: {
    key: string;
    value: {
      preview?: Blob;
      source?: Blob;
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
  };
}

const providers: { [key in DatabaseProvider]: DatabaseService } = {
  [DatabaseProvider.IndexedDB]: indexedDBService,
};
const appConfig = configService.getAppConfig();

export default providers[appConfig.database.provider](appConfig.database.name, appConfig.database.version);
