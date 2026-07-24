import { describe, test, expect, vi, beforeEach } from 'vitest';
import { DriveItemData } from 'app/drive/types';
import storageReducer, { storageActions } from '.';
import databaseService, { DatabaseCollection } from '../../../database/services/database.service';

vi.mock('./storage.thunks', () => ({ default: {}, storageExtraReducers: () => undefined }));

vi.mock('../../../database/services/database.service', () => ({
  default: { put: vi.fn(), get: vi.fn() },
  DatabaseCollection: { Levels: 'levels' },
}));

const buildDriveItemData = (overrides: Partial<DriveItemData> = {}): DriveItemData =>
  ({
    id: 1,
    uuid: 'item-uuid-1',
    name: 'document',
    plain_name: 'document',
    plainName: 'document',
    type: 'pdf',
    size: 1024,
    bucket: 'bucket-id',
    createdAt: '2024-01-01T00:00:00.000Z',
    created_at: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z',
    deleted: false,
    deletedAt: null,
    encrypt_version: '03-aes',
    fileId: 'file-id-1',
    folderId: 10,
    folder_id: 10,
    folderUuid: 'parent-folder-uuid',
    status: 'EXISTS',
    thumbnails: [],
    currentThumbnail: null,
    isFolder: false,
    color: null,
    icon: null,
    iconId: null,
    icon_id: null,
    parentId: 10,
    parentUuid: 'parent-folder-uuid',
    parent_id: 10,
    userId: 100,
    user_id: 100,
    ...overrides,
  }) as unknown as DriveItemData;

const buildInitialState = () => storageReducer(undefined, { type: '@@INIT' });

describe('storage slice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Add items', () => {
    test('When items are added to a folder with no prior content, then the folder contains exactly those items', () => {
      const folderId = 'folder-a';
      const item = buildDriveItemData({ uuid: 'uuid-1', id: 1 });
      const initialState = buildInitialState();

      const nextState = storageReducer(initialState, storageActions.addItems({ folderId, items: [item] }));

      expect(nextState.levels[folderId]).toEqual([item]);
    });

    test('When new items are added to a folder that already has content, then the new items appear after the existing ones', () => {
      const folderId = 'folder-b';
      const existing = buildDriveItemData({ uuid: 'uuid-existing', id: 1, name: 'existing.pdf' });
      const incoming = buildDriveItemData({ uuid: 'uuid-incoming', id: 2, name: 'incoming.pdf' });

      const stateWithExisting = storageReducer(
        buildInitialState(),
        storageActions.addItems({ folderId, items: [existing] }),
      );

      const nextState = storageReducer(stateWithExisting, storageActions.addItems({ folderId, items: [incoming] }));

      expect(nextState.levels[folderId]).toEqual([existing, incoming]);
    });

    test('When an item with a duplicate uuid is added, then only the first occurrence is kept in the folder', () => {
      const folderId = 'folder-c';
      const original = buildDriveItemData({ uuid: 'shared-uuid', id: 1, name: 'original.pdf' });
      const duplicate = buildDriveItemData({ uuid: 'shared-uuid', id: 99, name: 'duplicate.pdf' });

      const stateWithOriginal = storageReducer(
        buildInitialState(),
        storageActions.addItems({ folderId, items: [original] }),
      );

      const nextState = storageReducer(stateWithOriginal, storageActions.addItems({ folderId, items: [duplicate] }));

      expect(nextState.levels[folderId]).toHaveLength(1);
      expect(nextState.levels[folderId][0]).toEqual(original);
    });

    test('When an item without a uuid is added and a second item has the same properties, then only the first item is kept', () => {
      const folderId = 'folder-d';
      const sharedProps = {
        uuid: undefined as unknown as string,
        id: 42,
        name: 'no-uuid-file',
        updatedAt: '2024-06-01T00:00:00.000Z',
        type: 'docx',
      };
      const first = buildDriveItemData({ ...sharedProps });
      const identicalKey = buildDriveItemData({ ...sharedProps });

      const stateWithFirst = storageReducer(buildInitialState(), storageActions.addItems({ folderId, items: [first] }));

      const nextState = storageReducer(stateWithFirst, storageActions.addItems({ folderId, items: [identicalKey] }));

      expect(nextState.levels[folderId]).toHaveLength(1);
    });

    test('When items are added to one folder, then a different folder is not affected', () => {
      const folderA = 'folder-a';
      const folderB = 'folder-b';
      const itemA = buildDriveItemData({ uuid: 'uuid-a', id: 1, name: 'file-a.pdf' });
      const itemB = buildDriveItemData({ uuid: 'uuid-b', id: 2, name: 'file-b.pdf' });

      const stateWithFolderB = storageReducer(
        buildInitialState(),
        storageActions.addItems({ folderId: folderB, items: [itemB] }),
      );

      const nextState = storageReducer(
        stateWithFolderB,
        storageActions.addItems({ folderId: folderA, items: [itemA] }),
      );

      expect(nextState.levels[folderA]).toEqual([itemA]);
      expect(nextState.levels[folderB]).toEqual([itemB]);
    });

    test('When items are added to a folder, then the database is updated with the deduplicated folder contents', () => {
      const folderId = 'folder-e';
      const item = buildDriveItemData({ uuid: 'uuid-db', id: 1 });

      storageReducer(buildInitialState(), storageActions.addItems({ folderId, items: [item] }));

      expect(databaseService.put).toHaveBeenCalledWith(DatabaseCollection.Levels, folderId, [item]);
    });

    test('When an empty array of items is dispatched to a folder that already has content, then the folder content remains unchanged', () => {
      const folderId = 'folder-f';
      const existingItem = buildDriveItemData({ uuid: 'uuid-unchanged', id: 1 });

      const stateWithContent = storageReducer(
        buildInitialState(),
        storageActions.addItems({ folderId, items: [existingItem] }),
      );

      vi.clearAllMocks();

      const nextState = storageReducer(stateWithContent, storageActions.addItems({ folderId, items: [] }));

      expect(nextState.levels[folderId]).toEqual([existingItem]);
      expect(databaseService.put).toHaveBeenCalledWith(DatabaseCollection.Levels, folderId, [existingItem]);
    });
  });

  describe('Favorites', () => {
    test('When the favorites loading flag is set, then the state reflects the new value', () => {
      const nextState = storageReducer(buildInitialState(), storageActions.setIsLoadingFavorites(true));

      expect(nextState.isLoadingFavorites).toBe(true);
    });

    test('When favorites are added to existing ones, then the new items appear after the existing ones', () => {
      const existing = buildDriveItemData({ uuid: 'fav-uuid-1', id: 1, name: 'existing.pdf' });
      const incoming = buildDriveItemData({ uuid: 'fav-uuid-2', id: 2, name: 'incoming.pdf' });

      const stateWithExisting = storageReducer(buildInitialState(), storageActions.addFavorites([existing]));

      const nextState = storageReducer(stateWithExisting, storageActions.addFavorites([incoming]));

      expect(nextState.favorites).toEqual([existing, incoming]);
    });

    test('When a favorite with a duplicate uuid is added, then only the first occurrence is kept', () => {
      const original = buildDriveItemData({ uuid: 'fav-shared-uuid', id: 1, name: 'original.pdf' });
      const duplicate = buildDriveItemData({ uuid: 'fav-shared-uuid', id: 99, name: 'duplicate.pdf' });

      const stateWithOriginal = storageReducer(buildInitialState(), storageActions.addFavorites([original]));

      const nextState = storageReducer(stateWithOriginal, storageActions.addFavorites([duplicate]));

      expect(nextState.favorites).toHaveLength(1);
      expect(nextState.favorites[0]).toEqual(original);
    });

    test('When the has-more flags for favorite folders and files are set, then the state reflects the new values', () => {
      const stateWithoutMoreFolders = storageReducer(
        buildInitialState(),
        storageActions.setHasMoreFavoriteFolders(false),
      );
      const nextState = storageReducer(stateWithoutMoreFolders, storageActions.setHasMoreFavoriteFiles(false));

      expect(nextState.hasMoreFavoriteFolders).toBe(false);
      expect(nextState.hasMoreFavoriteFiles).toBe(false);
    });

    test('When the favorites pagination is reset, then the favorites are cleared and the has-more flags are restored', () => {
      const favorite = buildDriveItemData({ uuid: 'fav-uuid-1', id: 1 });
      let state = storageReducer(buildInitialState(), storageActions.addFavorites([favorite]));
      state = storageReducer(state, storageActions.setHasMoreFavoriteFolders(false));
      state = storageReducer(state, storageActions.setHasMoreFavoriteFiles(false));

      const nextState = storageReducer(state, storageActions.resetFavoritesPagination());

      expect(nextState.favorites).toEqual([]);
      expect(nextState.hasMoreFavoriteFolders).toBe(true);
      expect(nextState.hasMoreFavoriteFiles).toBe(true);
    });

    test('When an item is patched, then the matching favorite is updated and the rest are not affected', () => {
      const matching = buildDriveItemData({ uuid: 'fav-uuid-1', id: 1, name: 'old-name.pdf', isFolder: false });
      const other = buildDriveItemData({ uuid: 'fav-uuid-2', id: 2, name: 'other.pdf', isFolder: false });
      const state = storageReducer(buildInitialState(), storageActions.addFavorites([matching, other]));

      const nextState = storageReducer(
        state,
        storageActions.patchItem({
          uuid: matching.uuid,
          folderId: 'parent-folder-uuid',
          isFolder: false,
          patch: { name: 'new-name.pdf' },
        }),
      );

      expect(nextState.favorites[0].name).toBe('new-name.pdf');
      expect(nextState.favorites[1].name).toBe('other.pdf');
    });

    test('When the current thumbnails are cleared, then the favorites thumbnails are cleared too', () => {
      const favorite = buildDriveItemData({
        uuid: 'fav-uuid-1',
        id: 1,
        currentThumbnail: { urlObject: 'blob:thumbnail' } as unknown as DriveItemData['currentThumbnail'],
      });
      const state = storageReducer(buildInitialState(), storageActions.addFavorites([favorite]));

      const nextState = storageReducer(
        state,
        storageActions.clearCurrentThumbnailItems({ folderId: 'parent-folder-uuid' }),
      );

      expect(nextState.favorites[0].currentThumbnail).toBeNull();
    });

    test('When items are popped updating recents, then the matching favorites are removed and the rest are kept', () => {
      const toDelete = buildDriveItemData({ uuid: 'fav-uuid-1', id: 1, isFolder: false });
      const toKeep = buildDriveItemData({ uuid: 'fav-uuid-2', id: 2, isFolder: false });
      const state = storageReducer(buildInitialState(), storageActions.addFavorites([toDelete, toKeep]));

      const nextState = storageReducer(state, storageActions.popItems({ updateRecents: true, items: [toDelete] }));

      expect(nextState.favorites).toEqual([toKeep]);
    });
  });
});
