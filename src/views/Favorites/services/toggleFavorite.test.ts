import { describe, expect, it, vi, beforeEach } from 'vitest';
import { setItemFavorite } from './toggleFavorite';
import { SdkFactory } from 'app/core/factory/sdk';
import { DriveItemData } from 'app/drive/types';

describe('toggleFavorite service', () => {
  const mockResponse = { favorited: true };
  const mockMarkItemAsFavorite = vi.fn().mockResolvedValue(mockResponse);
  const mockUnmarkItemAsFavorite = vi.fn().mockResolvedValue(mockResponse);

  beforeEach(() => {
    vi.clearAllMocks();

    const mockStorageClient = {
      markItemAsFavorite: mockMarkItemAsFavorite,
      unmarkItemAsFavorite: mockUnmarkItemAsFavorite,
    };
    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createNewStorageClient: vi.fn().mockReturnValue(mockStorageClient),
    } as unknown as SdkFactory);
  });

  it('should mark a file as favorite', async () => {
    const file = { uuid: 'file-uuid', isFolder: false } as DriveItemData;

    const result = await setItemFavorite(file, true);

    expect(mockMarkItemAsFavorite).toHaveBeenCalledWith('file', 'file-uuid');
    expect(mockUnmarkItemAsFavorite).not.toHaveBeenCalled();
    expect(result).toEqual(mockResponse);
  });

  it('should unmark a file as favorite', async () => {
    const file = { uuid: 'file-uuid', isFolder: false } as DriveItemData;

    await setItemFavorite(file, false);

    expect(mockUnmarkItemAsFavorite).toHaveBeenCalledWith('file', 'file-uuid');
    expect(mockMarkItemAsFavorite).not.toHaveBeenCalled();
  });

  it('should mark a folder as favorite', async () => {
    const folder = { uuid: 'folder-uuid', isFolder: true } as DriveItemData;

    await setItemFavorite(folder, true);

    expect(mockMarkItemAsFavorite).toHaveBeenCalledWith('folder', 'folder-uuid');
    expect(mockUnmarkItemAsFavorite).not.toHaveBeenCalled();
  });

  it('should unmark a folder as favorite', async () => {
    const folder = { uuid: 'folder-uuid', isFolder: true } as DriveItemData;

    await setItemFavorite(folder, false);

    expect(mockUnmarkItemAsFavorite).toHaveBeenCalledWith('folder', 'folder-uuid');
  });
});
