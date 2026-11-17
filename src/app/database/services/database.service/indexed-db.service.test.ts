import { afterEach, describe, expect, test } from 'vitest';
import * as idb from 'idb';
import { v7 as uuidV7 } from 'uuid';
import indexedDBService from './indexed-db.service';
import { DatabaseCollection, LRUCacheTypes } from '../../types';

const VERSION_7_AND_8_STORES = [
  'levels',
  'lru_cache',
  'account_settings',
  'move_levels',
  'upload_item_status',
  'workspaces_avatar_blobs',
  'crypto_keys',
];

const createOldDatabase = async (name: string, version: number, extraStores: string[] = []) => {
  const db = await idb.openDB(name, version, {
    upgrade: (database) => {
      const blobs = database.createObjectStore('levels_blobs');
      blobs.createIndex('parent_index', 'parentId', { unique: false });
      [...VERSION_7_AND_8_STORES, ...extraStores].forEach((store) => database.createObjectStore(store));
    },
  });
  await db.put('levels', [{ uuid: 'folder-item' }], 'folder');
  await db.put(
    'levels_blobs',
    { uuid: 'file', parentId: 1, source: new Blob(['a']), preview: new Blob(['b']) },
    'file',
  );
  await db.put('lru_cache', { lruKeyList: ['file'], itemsListSize: 1 }, LRUCacheTypes.LevelsBlobs);
  if (extraStores.includes('photos_thumbnails')) {
    await db.put('photos_thumbnails', { preview: new Blob(['old']), updatedAt: 'v0' }, '101');
  }
  db.close();
};

describe('Local database upgrade to version 9', () => {
  let databaseName: string;

  afterEach(() => idb.deleteDB(databaseName));

  test.each([7, 8])(
    'When a version %i database is opened, then cached file blobs are dropped and the rest of the data is kept',
    async (version) => {
      databaseName = `upgrade-${uuidV7()}`;
      await createOldDatabase(databaseName, version);

      const database = indexedDBService(databaseName, 9);

      expect(await database.get(DatabaseCollection.Levels, 'folder')).toEqual([{ uuid: 'folder-item' }]);
      expect(await database.get(DatabaseCollection.LevelsBlobs, 'file')).toBeUndefined();
      expect(await database.get(DatabaseCollection.LRU_cache, LRUCacheTypes.LevelsBlobs)).toBeUndefined();
    },
  );

  test('When a version 8 database with Photos thumbnails is opened, then the thumbnails it had are dropped', async () => {
    databaseName = `upgrade-${uuidV7()}`;
    await createOldDatabase(databaseName, 8, ['photos_thumbnails']);

    const database = indexedDBService(databaseName, 9);

    expect(await database.get(DatabaseCollection.PhotosThumbnails, '101')).toBeUndefined();
  });

  test.each([
    ['a new database', undefined, []],
    ['a version 7 database', 7, []],
    ['a version 8 database', 8, []],
    ['a version 8 database with Photos thumbnails', 8, ['photos_thumbnails']],
  ])(
    'When %s is opened, then file contents, Drive previews and Photos thumbnails can be cached',
    async (_, version, extraStores) => {
      databaseName = `upgrade-${uuidV7()}`;
      if (version) await createOldDatabase(databaseName, version, extraStores);
      const database = indexedDBService(databaseName, 9);
      const preview = { preview: new Blob(['thumbnail']), updatedAt: 'v1' };

      await database.put(DatabaseCollection.LevelsBlobs, 'file', {
        uuid: 'file',
        parentId: 1,
        source: new Blob(['content']),
        updatedAt: 'v1',
      });
      await database.put(DatabaseCollection.LevelsBlobsPreviews, 'file', preview);
      await database.put(DatabaseCollection.PhotosThumbnails, 'photo', preview);

      expect((await database.get(DatabaseCollection.LevelsBlobs, 'file'))?.updatedAt).toBe('v1');
      expect((await database.get(DatabaseCollection.LevelsBlobsPreviews, 'file'))?.updatedAt).toBe('v1');
      expect((await database.get(DatabaseCollection.PhotosThumbnails, 'photo'))?.updatedAt).toBe('v1');
    },
  );
});
