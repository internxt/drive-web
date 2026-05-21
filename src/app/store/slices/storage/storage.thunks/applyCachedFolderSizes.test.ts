import { beforeEach, describe, expect, test, vi } from 'vitest';
import { applyCachedFolderSizes } from './applyCachedFolderSizes';
import { getDriveItemData } from 'testUtils/fixtures/drive.fixtures';

const { mockDatabaseGet } = vi.hoisted(() => ({ mockDatabaseGet: vi.fn() }));

vi.mock('../../../../database/services/database.service', () => ({
  default: {
    get: mockDatabaseGet,
  },
  DatabaseCollection: {
    Levels: 'levels',
  },
}));

describe('Apply Cached Folder Sizes', () => {
  const folderId = 'parent-folder-uuid';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When there is no cache entry for the folder, then items are returned unchanged', async () => {
    mockDatabaseGet.mockResolvedValue(null);
    const file = getDriveItemData({ uuid: 'file-uuid', isFolder: false, size: 500 });
    const folder = getDriveItemData({ uuid: 'folder-uuid', isFolder: true, size: 0 });

    const result = await applyCachedFolderSizes(folderId, [file, folder]);

    expect(result).toEqual([file, folder]);
  });

  test('When the cache entry exists but the matched item is a file, then the file is returned unchanged', async () => {
    const fileUuid = 'file-uuid';
    mockDatabaseGet.mockResolvedValue([
      getDriveItemData({ uuid: fileUuid, isFolder: false, size: 999, sizeComputed: true }),
    ]);
    const file = getDriveItemData({ uuid: fileUuid, isFolder: false, size: 100 });

    const result = await applyCachedFolderSizes(folderId, [file]);

    expect(result[0].size).toBe(100);
  });

  test('When the cache entry has a folder without size computed, then the folder size is not updated', async () => {
    const folderUuid = 'folder-uuid';
    mockDatabaseGet.mockResolvedValue([
      getDriveItemData({ uuid: folderUuid, isFolder: true, size: 9000, sizeComputed: false }),
    ]);
    const folder = getDriveItemData({ uuid: folderUuid, isFolder: true, size: 0, sizeComputed: false });

    const result = await applyCachedFolderSizes(folderId, [folder]);

    expect(result[0].size).toBe(0);
    expect(result[0].sizeComputed).toBeFalsy();
  });

  test('When the cache has a computed folder size, then the matching folder receives the cached size', async () => {
    const folderUuid = 'folder-uuid';
    const cachedSize = 42000;
    mockDatabaseGet.mockResolvedValue([
      getDriveItemData({ uuid: folderUuid, isFolder: true, size: cachedSize, sizeComputed: true }),
    ]);
    const folder = getDriveItemData({ uuid: folderUuid, isFolder: true, size: 0, sizeComputed: false });

    const result = await applyCachedFolderSizes(folderId, [folder]);

    expect(result[0].size).toBe(cachedSize);
    expect(result[0].sizeComputed).toBe(true);
  });

  test('When a cached folder entry has no uuid, then the corresponding input folder is returned unchanged', async () => {
    const cachedFolderWithoutUuid = getDriveItemData({
      uuid: undefined as unknown as string,
      isFolder: true,
      size: 5000,
      sizeComputed: true,
    });
    mockDatabaseGet.mockResolvedValue([cachedFolderWithoutUuid]);
    const folder = getDriveItemData({ uuid: 'folder-uuid', isFolder: true, size: 0, sizeComputed: false });

    const result = await applyCachedFolderSizes(folderId, [folder]);

    expect(result[0].size).toBe(0);
    expect(result[0].sizeComputed).toBeFalsy();
  });

  test('When a mix of files and folders is given, then only folders with cached sizes are updated', async () => {
    const cachedFolderUuid = 'cached-folder-uuid';
    const uncachedFolderUuid = 'uncached-folder-uuid';
    const fileUuid = 'file-uuid';
    const cachedSize = 77000;

    mockDatabaseGet.mockResolvedValue([
      getDriveItemData({ uuid: cachedFolderUuid, isFolder: true, size: cachedSize, sizeComputed: true }),
    ]);

    const file = getDriveItemData({ uuid: fileUuid, isFolder: false, size: 200 });
    const cachedFolder = getDriveItemData({ uuid: cachedFolderUuid, isFolder: true, size: 0, sizeComputed: false });
    const uncachedFolder = getDriveItemData({
      uuid: uncachedFolderUuid,
      isFolder: true,
      size: 0,
      sizeComputed: false,
    });

    const result = await applyCachedFolderSizes(folderId, [file, cachedFolder, uncachedFolder]);

    expect(result[0].size).toBe(200);
    expect(result[1]).contain({
      size: cachedSize,
      sizeComputed: true,
    });
    expect(result[2]).contain({
      size: 0,
      sizeComputed: false,
    });
  });

  test('When multiple folders are present and only some have cached sizes, then only those matching the cache are updated', async () => {
    const folderAUuid = 'folder-a-uuid';
    const folderBUuid = 'folder-b-uuid';
    const folderCUuid = 'folder-c-uuid';
    const cachedSizeA = 10000;
    const cachedSizeC = 30000;

    mockDatabaseGet.mockResolvedValue([
      getDriveItemData({ uuid: folderAUuid, isFolder: true, size: cachedSizeA, sizeComputed: true }),
      getDriveItemData({ uuid: folderCUuid, isFolder: true, size: cachedSizeC, sizeComputed: true }),
    ]);

    const folderA = getDriveItemData({ uuid: folderAUuid, isFolder: true, size: 0, sizeComputed: false });
    const folderB = getDriveItemData({ uuid: folderBUuid, isFolder: true, size: 0, sizeComputed: false });
    const folderC = getDriveItemData({ uuid: folderCUuid, isFolder: true, size: 0, sizeComputed: false });

    const result = await applyCachedFolderSizes(folderId, [folderA, folderB, folderC]);

    expect(result[0].size).toBe(cachedSizeA);
    expect(result[0].sizeComputed).toBe(true);
    expect(result[1].size).toBe(0);
    expect(result[1].sizeComputed).toBeFalsy();
    expect(result[2].size).toBe(cachedSizeC);
    expect(result[2].sizeComputed).toBe(true);
  });
});
