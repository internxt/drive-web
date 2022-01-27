import * as idb from 'idb';
import { AppDatabase, DatabaseService, PersistenceLayer } from '.';

const getIndexedDB = (name, version) => {
  return idb.openDB<AppDatabase>(name, version, {
    upgrade: (db) => {
      db.createObjectStore('levels');
    },
    blocked: () => undefined,
    blocking: () => undefined,
    terminated: () => undefined,
  });
};

const open = async (name: string, version?: number): Promise<PersistenceLayer> => {
  try {
    // Try to instantiate IndexedDB
    await getIndexedDB(name, version);
    return {
      put: async (collectionName, key, value) => {
        const db = await getIndexedDB(name, version);
        await db.put(collectionName, value, key);
        db.close();
      },
      get: async (collectionName, key) => {
        const db = await getIndexedDB(name, version);
        const content = await db.get(collectionName, key);
        db.close();
        return content;
      },
      clear: () => idb.deleteDB(name),
    };
  } catch (e) {
    // If it fails means we are, most likely,
    // on Firefox Private mode, so we use a different storage
    return {
      put: async (collectionName, key, value) => {
        localStorage.setItem(`${collectionName}_${key}`, JSON.stringify(value));
      },
      get: async (collectionName, key) => {
        return JSON.parse(<string>localStorage.getItem(`${collectionName}_${key}`));
      },
      clear: async () => {
        localStorage.clear();
      },
    };
  }
};

const indexedDBService: DatabaseService = (databaseName, databaseVersion) => {
  return open(databaseName, databaseVersion);
};

export default indexedDBService;
