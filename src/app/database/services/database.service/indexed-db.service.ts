import browserService, { Browser } from '../../../core/services/browser.service';
import * as idb from 'idb';
import { AppDatabase, DatabaseService } from '.';

const open = (name: string, version?: number): Promise<idb.IDBPDatabase<AppDatabase>> => {
  return idb.openDB<AppDatabase>(name, version, {
    upgrade: (db, oldVersion) => {
      if (oldVersion === 0) db.createObjectStore('levels');
      if (oldVersion <= 2) {
        const objectStore = db.createObjectStore('levels_blobs');
        objectStore.createIndex('parent_index' as never, 'parentId', { unique: false });
        db.createObjectStore('lru_cache');
      }
      if (oldVersion <= 3) {
        db.createObjectStore('account_settings');
        db.createObjectStore('move_levels');
      }
      if (oldVersion <= 4) {
        db.createObjectStore('upload_item_status');
      }
      if (oldVersion <= 5) {
        db.createObjectStore('workspaces_avatar_blobs');
      }
    },
    blocked: () => undefined,
    blocking: () => undefined,
    terminated: () => undefined,
  });
};

const indexedDBIsAvailable = async () =>
  !(await browserService.isBrowser({ browser: Browser.Firefox, incognito: true }));

const indexedDBService: DatabaseService = (databaseName, databaseVersion) => ({
  isAvailable: indexedDBIsAvailable,
  put: async (collectionName, key, value) => {
    const available = await indexedDBIsAvailable();
    if (!available) return undefined;
    const db = await open(databaseName, databaseVersion);
    await db.put(collectionName, value, key);
    db.close();
  },
  get: async (collectionName, key) => {
    const available = await indexedDBIsAvailable();
    if (!available) return undefined;
    const db = await open(databaseName, databaseVersion);
    const content = await db.get(collectionName, key);
    db.close();

    return content;
  },
  clear: () => idb.deleteDB(databaseName),
  delete: async (collectionName, key) => {
    const available = await indexedDBIsAvailable();
    if (!available) return undefined;
    const db = await open(databaseName, databaseVersion);
    await db.delete(collectionName, key);
    db.close();
  },
  getAll: async (collectionName) => {
    const available = await indexedDBIsAvailable();
    if (!available) return undefined;
    const db = await open(databaseName, databaseVersion);
    const data = await db.getAll(collectionName);
    db.close();
    return data;
  },
  getAllFromIndex: async (collectionName, indexName, key) => {
    const available = await indexedDBIsAvailable();
    if (!available) return undefined;
    const db = await open(databaseName, databaseVersion);
    const data = await db.getAllFromIndex(collectionName, indexName as never, IDBKeyRange.only(key));
    db.close();
    return data;
  },
});

export default indexedDBService;
