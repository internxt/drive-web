import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import newStorageService from '../../../../drive/services/new-storage.service';
import { DriveFolderData } from '../../../../drive/types';

import { checkFolderDuplicated } from './checkFolderDuplicated';

vi.mock('../../../../drive/services/new-storage.service', () => ({
  default: {
    checkDuplicatedFolders: vi.fn(),
  },
}));

describe('checkFolderDuplicated', () => {
  const parentFolderId = 'parent-folder-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty results when there are no folders', async () => {
    const folders = [];
    const result = await checkFolderDuplicated(folders, parentFolderId);

    expect(result).toEqual({
      duplicatedFoldersResponse: [],
      foldersWithDuplicates: [],
      foldersWithoutDuplicates: [],
    });
  });

  it('should return all folders as duplicated when all are duplicated', async () => {
    const folders = [{ name: 'Folder1' }, { name: 'Folder2' }] as DriveFolderData[];

    (newStorageService.checkDuplicatedFolders as Mock).mockResolvedValue({
      existentFolders: [{ plainName: 'Folder1' }, { plainName: 'Folder2' }],
    });

    const result = await checkFolderDuplicated(folders, parentFolderId);

    expect(newStorageService.checkDuplicatedFolders).toHaveBeenCalledWith(parentFolderId, ['Folder1', 'Folder2']);
    expect(result).toEqual({
      duplicatedFoldersResponse: [{ plainName: 'Folder1' }, { plainName: 'Folder2' }],
      foldersWithDuplicates: folders,
      foldersWithoutDuplicates: [],
    });
  });

  it('should return some folders as duplicated and others without duplicates', async () => {
    const folders = [{ name: 'Folder1' }, { name: 'Folder2' }, { name: 'Folder3' }] as DriveFolderData[];
    const parentFolderId = 'someParentId';

    (newStorageService.checkDuplicatedFolders as Mock).mockResolvedValue({
      existentFolders: [{ plainName: 'Folder1' }, { plainName: 'Folder3' }],
    });

    const result = await checkFolderDuplicated(folders, parentFolderId);

    expect(newStorageService.checkDuplicatedFolders).toHaveBeenCalledWith(parentFolderId, [
      'Folder1',
      'Folder2',
      'Folder3',
    ]);
    expect(result).toEqual({
      duplicatedFoldersResponse: [{ plainName: 'Folder1' }, { plainName: 'Folder3' }],
      foldersWithDuplicates: [{ name: 'Folder1' }, { name: 'Folder3' }],
      foldersWithoutDuplicates: [{ name: 'Folder2' }],
    });
  });

  it('should return all folders without duplicates when none are duplicated', async () => {
    const folders = [{ name: 'Folder1' }, { name: 'Folder2' }] as DriveFolderData[];

    (newStorageService.checkDuplicatedFolders as Mock).mockResolvedValue({
      existentFolders: [],
    });

    const result = await checkFolderDuplicated(folders, parentFolderId);

    expect(newStorageService.checkDuplicatedFolders).toHaveBeenCalledWith(parentFolderId, ['Folder1', 'Folder2']);
    expect(result).toEqual({
      duplicatedFoldersResponse: [],
      foldersWithDuplicates: [],
      foldersWithoutDuplicates: folders,
    });
  });
});
