import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fetchRecents } from './fetchRecents';
import { SdkFactory } from 'app/core/factory/sdk';

describe('fetchRecents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch recent files with the specified limit', async () => {
    const mockLimit = 10;
    const mockFiles = [
      { id: 1, name: 'file1.txt' },
      { id: 2, name: 'file2.txt' },
    ];
    const mockGetRecentFilesV2 = vi.fn().mockResolvedValue(mockFiles);
    const mockStorageClient = { getRecentFilesV2: mockGetRecentFilesV2 };

    vi.spyOn(SdkFactory, 'getNewApiInstance').mockReturnValue({
      createNewStorageClient: vi.fn().mockReturnValue(mockStorageClient),
    } as any);

    const result = await fetchRecents(mockLimit);

    expect(SdkFactory.getNewApiInstance).toHaveBeenCalled();
    expect(mockGetRecentFilesV2).toHaveBeenCalledWith(mockLimit);
    expect(result).toEqual(mockFiles);
  });
});
