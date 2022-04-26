import * as idb from 'idb';
import { AppDatabase, DatabaseService } from '.';

const open = (name: string, version?: number): Promise<idb.IDBPDatabase<AppDatabase>> => {
  return idb.openDB<AppDatabase>(name, version, {
    upgrade: (db, oldVersion) => {
      if (oldVersion === 0) db.createObjectStore('levels');
      if (oldVersion <= 1) db.createObjectStore('photos');
    },
    blocked: () => undefined,
    blocking: () => undefined,
    terminated: () => undefined,
  });
};

const indexedDBService: DatabaseService = (databaseName, databaseVersion) => ({
  put: async (collectionName, key, value) => {
    const db = await open(databaseName, databaseVersion);
    await db.put(collectionName, value, key);
    db.close();
  },
  get: async (collectionName, key) => {
    const db = await open(databaseName, databaseVersion);
    const content = await db.get(collectionName, key);
    db.close();

    return content;
  },
  clear: () => idb.deleteDB(databaseName),
});

export default indexedDBService;
