import { describe, expect, test, vi, beforeEach } from 'vitest';
import { setItemFavorite } from './toggleFavorite.service';
import { DriveItemData } from 'app/drive/types';
import { mockSdkFactory } from 'testUtils/sdk.mock';

describe('toggleFavorite service', () => {
  const mockResponse = { favorited: true };
  const mockMarkItemAsFavorite = vi.fn().mockResolvedValue(mockResponse);
  const mockUnmarkItemAsFavorite = vi.fn().mockResolvedValue(mockResponse);

  beforeEach(() => {
    const mockStorageClient = {
      markItemAsFavorite: mockMarkItemAsFavorite,
      unmarkItemAsFavorite: mockUnmarkItemAsFavorite,
    };
    mockSdkFactory({ createNewStorageClient: mockStorageClient });
  });

  test('When a file is marked as favorite, then it is set as favorite', async () => {
    const file = { uuid: 'file-uuid', isFolder: false } as DriveItemData;

    const result = await setItemFavorite(file, true);

    expect(mockMarkItemAsFavorite).toHaveBeenCalledWith('file', 'file-uuid');
    expect(mockUnmarkItemAsFavorite).not.toHaveBeenCalled();
    expect(result).toEqual(mockResponse);
  });

  test('When a file is unmarked as favorite, then it is removed as favorite', async () => {
    const file = { uuid: 'file-uuid', isFolder: false } as DriveItemData;

    await setItemFavorite(file, false);

    expect(mockUnmarkItemAsFavorite).toHaveBeenCalledWith('file', 'file-uuid');
    expect(mockMarkItemAsFavorite).not.toHaveBeenCalled();
  });

  test('When a folder is marked as favorite, then it is set as favorite', async () => {
    const folder = { uuid: 'folder-uuid', isFolder: true } as DriveItemData;

    await setItemFavorite(folder, true);

    expect(mockMarkItemAsFavorite).toHaveBeenCalledWith('folder', 'folder-uuid');
    expect(mockUnmarkItemAsFavorite).not.toHaveBeenCalled();
  });

  test('When a folder is unmarked as favorite, then it is removed as favorite', async () => {
    const folder = { uuid: 'folder-uuid', isFolder: true } as DriveItemData;

    await setItemFavorite(folder, false);

    expect(mockUnmarkItemAsFavorite).toHaveBeenCalledWith('folder', 'folder-uuid');
  });
});
