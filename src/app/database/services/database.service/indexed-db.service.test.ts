import { afterEach, describe, expect, test } from 'vitest';
import * as idb from 'idb';
import { v7 as uuidV7 } from 'uuid';
import indexedDBService from './indexed-db.service';
import { DatabaseCollection, LRUCacheTypes } from '../../types';

const VERSION_8_STORES = [
  'levels',
  'lru_cache',
  'account_settings',
  'move_levels',
  'upload_item_status',
  'workspaces_avatar_blobs',
  'crypto_keys',
];

const createVersion8Database = async (name: string, extraStores: string[] = []) => {
  const db = await idb.openDB(name, 8, {
    upgrade: (database) => {
      const blobs = database.createObjectStore('levels_blobs');
      blobs.createIndex('parent_index', 'parentId', { unique: false });
      [...VERSION_8_STORES, ...extraStores].forEach((store) => database.createObjectStore(store));
    },
  });
  await db.put('levels', [{ uuid: 'folder-item' }], 'folder');
  await db.put(
    'levels_blobs',
    { uuid: 'file', parentId: 1, source: new Blob(['a']), preview: new Blob(['b']) },
    'file',
  );
  await db.put('lru_cache', { lruKeyList: ['file'], itemsListSize: 1 }, LRUCacheTypes.LevelsBlobs);
  db.close();
};

describe('Local database upgrade to version 9', () => {
  let databaseName: string;

  afterEach(() => idb.deleteDB(databaseName));

  test('When a version 8 database is opened, then cached file blobs are dropped and the rest of the data is kept', async () => {
    databaseName = `upgrade-${uuidV7()}`;
    await createVersion8Database(databaseName);

    const database = indexedDBService(databaseName, 9);

    expect(await database.get(DatabaseCollection.Levels, 'folder')).toEqual([{ uuid: 'folder-item' }]);
    expect(await database.get(DatabaseCollection.LevelsBlobs, 'file')).toBeUndefined();
    expect(await database.get(DatabaseCollection.LRU_cache, LRUCacheTypes.LevelsBlobs)).toBeUndefined();
  });

  test.each([
    ['without', []],
    ['with', ['photos_thumbnails']],
  ])(
    'When a version 8 database %s a Photos thumbnails store is opened, then Drive previews and Photos thumbnails can be cached',
    async (_, extraStores) => {
      databaseName = `upgrade-${uuidV7()}`;
      await createVersion8Database(databaseName, extraStores);
      const database = indexedDBService(databaseName, 9);
      const preview = { preview: new Blob(['thumbnail']), updatedAt: 'v1' };

      await database.put(DatabaseCollection.LevelsBlobsPreviews, 'file', preview);
      await database.put(DatabaseCollection.PhotosThumbnails, 'photo', preview);

      expect((await database.get(DatabaseCollection.LevelsBlobsPreviews, 'file'))?.updatedAt).toBe('v1');
      expect((await database.get(DatabaseCollection.PhotosThumbnails, 'photo'))?.updatedAt).toBe('v1');
    },
  );
});
