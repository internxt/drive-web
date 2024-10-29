import { describe, expect, it, vi, beforeEach, Mock } from 'vitest';

import newStorageService from '../../../../drive/services/new-storage.service';
import { DriveFolderData } from '../../../../drive/types';

import { getUniqueFolderName } from './getUniqueFolderName';
import * as renameFolderModule from './renameFolderIfNeeded';

vi.mock('../../../../drive/services/new-storage.service', () => ({
  default: {
    checkDuplicatedFolders: vi.fn(),
  },
}));

vi.mock('../storage.thunks/uploadFolderThunk');

describe('getUniqueFolderName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the original name if no duplicates exist', async () => {
    const folderName = 'TestFolder';
    const duplicatedFolders: [] = [];
    const parentFolderId = 'parent123';

    (newStorageService.checkDuplicatedFolders as Mock).mockResolvedValue({ existentFolders: [] });

    const renameFolderIfNeeded = vi.spyOn(renameFolderModule, 'default');

    const result = await getUniqueFolderName(folderName, duplicatedFolders, parentFolderId);

    expect(result).toBe(folderName);
    expect(newStorageService.checkDuplicatedFolders).toHaveBeenCalledWith(parentFolderId, [folderName]);
    expect(renameFolderIfNeeded).toHaveBeenCalledWith([], folderName);
  });

  it('should rename the folder if duplicates exist', async () => {
    const folderName = 'TestFolder';
    const duplicatedFolders = [{ name: 'TestFolder', plainName: 'TestFolder' }] as DriveFolderData[];
    const parentFolderId = 'parent123';

    (newStorageService.checkDuplicatedFolders as Mock)
      .mockResolvedValueOnce({ existentFolders: [{ plainName: 'TestFolder' }] })
      .mockResolvedValueOnce({ existentFolders: [] });
    const renameFolderIfNeeded = vi.spyOn(renameFolderModule, 'default');

    const result = await getUniqueFolderName(folderName, duplicatedFolders, parentFolderId);

    expect(result).toBe('TestFolder (1)');
    expect(newStorageService.checkDuplicatedFolders).toHaveBeenCalledTimes(2);
    expect(newStorageService.checkDuplicatedFolders).toHaveBeenCalledWith(parentFolderId, ['TestFolder (1)']);
    expect(renameFolderIfNeeded).toHaveBeenCalledTimes(2);
  });

  it('should handle multiple renames if necessary', async () => {
    const folderName = 'TestFolder';
    const duplicatedFolders = [
      { name: 'TestFolder', plainName: 'TestFolder' },
      { name: 'TestFolder (1)', plainName: 'TestFolder (1)' },
    ] as DriveFolderData[];
    const parentFolderId = 'parent123';

    (newStorageService.checkDuplicatedFolders as Mock)
      .mockResolvedValueOnce({ existentFolders: [{ plainName: 'TestFolder' }] })
      .mockResolvedValueOnce({ existentFolders: [{ plainName: 'TestFolder (1)' }] })
      .mockResolvedValueOnce({ existentFolders: [] });

    const renameFolderIfNeeded = vi.spyOn(renameFolderModule, 'default');

    const result = await getUniqueFolderName(folderName, duplicatedFolders, parentFolderId);

    expect(result).toBe('TestFolder (2)');
    expect(newStorageService.checkDuplicatedFolders).toHaveBeenCalledTimes(3);
    expect(newStorageService.checkDuplicatedFolders).toHaveBeenLastCalledWith(parentFolderId, ['TestFolder (2)']);
    expect(renameFolderIfNeeded).toHaveBeenCalledTimes(3);
  });
});
