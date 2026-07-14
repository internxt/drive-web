import { describe, expect, it, vi, beforeEach } from 'vitest';
import { setItemFavorite } from './toggleFavorite';
import { SdkFactory } from 'app/core/factory/sdk';
import { DriveItemData } from 'app/drive/types';

describe('toggleFavorite service', () => {
  const mockResponse = { favorited: true };
  const mockMarkFileAsFavorite = vi.fn().mockResolvedValue(mockResponse);
  const mockUnmarkFileAsFavorite = vi.fn().mockResolvedValue(mockResponse);
  const mockMarkFolderAsFavorite = vi.fn().mockResolvedValue(mockResponse);
  const mockUnmarkFolderAsFavorite = vi.fn().mockResolvedValue(mockResponse);

  beforeEach(() => {
    vi.clearAllMocks();

    const mockStorageClient = {
      markFileAsFavorite: mockMarkFileAsFavorite,
      unmarkFileAsFavorite: mockUnmarkFileAsFavorite,
      markFolderAsFavorite: mockMarkFolderAsFavorite,
      unmarkFolderAsFavorite: mockUnmarkFolderAsFavorite,
    };
    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createNewStorageClient: vi.fn().mockReturnValue(mockStorageClient),
    } as unknown as SdkFactory);
  });

  it('should mark a file as favorite', async () => {
    const file = { uuid: 'file-uuid', isFolder: false } as DriveItemData;

    const result = await setItemFavorite(file, true);

    expect(mockMarkFileAsFavorite).toHaveBeenCalledWith('file-uuid');
    expect(mockUnmarkFileAsFavorite).not.toHaveBeenCalled();
    expect(result).toEqual(mockResponse);
  });

  it('should unmark a file as favorite', async () => {
    const file = { uuid: 'file-uuid', isFolder: false } as DriveItemData;

    await setItemFavorite(file, false);

    expect(mockUnmarkFileAsFavorite).toHaveBeenCalledWith('file-uuid');
    expect(mockMarkFileAsFavorite).not.toHaveBeenCalled();
  });

  it('should mark a folder as favorite', async () => {
    const folder = { uuid: 'folder-uuid', isFolder: true } as DriveItemData;

    await setItemFavorite(folder, true);

    expect(mockMarkFolderAsFavorite).toHaveBeenCalledWith('folder-uuid');
    expect(mockMarkFileAsFavorite).not.toHaveBeenCalled();
  });

  it('should unmark a folder as favorite', async () => {
    const folder = { uuid: 'folder-uuid', isFolder: true } as DriveItemData;

    await setItemFavorite(folder, false);

    expect(mockUnmarkFolderAsFavorite).toHaveBeenCalledWith('folder-uuid');
  });
});
