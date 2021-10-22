import { DBSchema, StoreKey, StoreNames, StoreValue } from 'idb';
import configService from '../../../core/services/config.service';
import { DriveItemData } from '../../../drive/types';
import indexedDBService from './indexed-db.service';

export enum DatabaseProvider {
  IndexedDB = 'indexed-db',
}

export enum DatabaseCollection {
  Levels = 'levels',
}

export interface AppDatabase extends DBSchema {
  levels: {
    key: number;
    value: DriveItemData[];
  };
}

export interface DatabaseService {
  (databaseName: string, databaseVersion: number): {
    put: <Name extends StoreNames<AppDatabase>>(
      collectionName: DatabaseCollection,
      key: StoreKey<AppDatabase, Name>,
      value: StoreValue<AppDatabase, Name>,
    ) => Promise<void>;
    get: <Name extends StoreNames<AppDatabase>>(
      collectionName: DatabaseCollection,
      key: StoreKey<AppDatabase, Name>,
    ) => Promise<StoreValue<AppDatabase, Name> | undefined>;
    clear: () => Promise<void>;
  };
}

const providers: { [key in DatabaseProvider]: DatabaseService } = {
  [DatabaseProvider.IndexedDB]: indexedDBService,
};
const appConfig = configService.getAppConfig();

export default providers[appConfig.database.provider](appConfig.database.name, appConfig.database.version);
