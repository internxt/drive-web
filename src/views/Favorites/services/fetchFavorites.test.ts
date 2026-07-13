import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchFavoriteFolders, fetchFavoriteFiles } from './fetchFavorites';
import { SdkFactory } from 'app/core/factory/sdk';

describe('fetchFavorites services', () => {
  const mockFolders = [
    { uuid: 'folder-uuid-1', plainName: 'folder1' },
    { uuid: 'folder-uuid-2', plainName: 'folder2' },
  ];
  const mockFiles = [
    { uuid: 'file-uuid-1', plainName: 'file1.txt' },
    { uuid: 'file-uuid-2', plainName: 'file2.txt' },
  ];
  const mockGetFavoriteFolders = vi.fn().mockReturnValue([Promise.resolve(mockFolders), { cancel: () => null }]);
  const mockGetFavoriteFiles = vi.fn().mockReturnValue([Promise.resolve(mockFiles), { cancel: () => null }]);

  beforeEach(() => {
    vi.clearAllMocks();

    const mockStorageClient = { getFavoriteFolders: mockGetFavoriteFolders, getFavoriteFiles: mockGetFavoriteFiles };
    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createNewStorageClient: vi.fn().mockReturnValue(mockStorageClient),
    } as unknown as SdkFactory);
  });

  it('should fetch favorite folders with the specified limit and offset', async () => {
    const result = await fetchFavoriteFolders(50, 10);

    expect(SdkFactory.getNewApiInstance).toHaveBeenCalled();
    expect(mockGetFavoriteFolders).toHaveBeenCalledWith({ limit: 50, offset: 10 });
    expect(result).toEqual(mockFolders);
  });

  it('should fetch favorite files with the specified limit and offset', async () => {
    const result = await fetchFavoriteFiles(50, 20);

    expect(SdkFactory.getNewApiInstance).toHaveBeenCalled();
    expect(mockGetFavoriteFiles).toHaveBeenCalledWith({ limit: 50, offset: 20 });
    expect(result).toEqual(mockFiles);
  });
});
