import { describe, expect, it, vi, beforeEach, Mock } from 'vitest';
import { fetchRecents } from './fetchRecents';
import { SdkFactory } from 'app/core/factory/sdk';

vi.mock('app/core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(),
  },
}));

describe('fetchRecents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call getRecentFilesV2 with the correct limit', async () => {
    const mockLimit = 10;
    const mockFiles = [
      { id: 1, name: 'file1.txt' },
      { id: 2, name: 'file2.txt' },
    ];
    const mockGetRecentFilesV2 = vi.fn().mockResolvedValue(mockFiles);
    const mockStorageClient = { getRecentFilesV2: mockGetRecentFilesV2 };

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createNewStorageClient: vi.fn().mockReturnValue(mockStorageClient),
    });

    const result = await fetchRecents(mockLimit);

    expect(SdkFactory.getNewApiInstance).toHaveBeenCalled();
    expect(mockGetRecentFilesV2).toHaveBeenCalledWith(mockLimit);
    expect(result).toEqual(mockFiles);
  });
});
