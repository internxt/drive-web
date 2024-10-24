import * as internxtLib from '@internxt/lib';
import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import newStorageService from '../../../../drive/services/new-storage.service';
import { getUniqueFilename } from './getUniqueFilename';

jest.mock('../../../../drive/services/new-storage.service', () => ({
  checkDuplicatedFiles: jest.fn(),
}));

describe('getUniqueFilename', () => {
  let renameIfNeededSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    renameIfNeededSpy = jest.spyOn(internxtLib.items, 'renameIfNeeded');
  });

  it('should return the original name if no duplicates exist', async () => {
    const filename = 'TestFile';
    const extension = 'txt';
    const duplicatedFiles = [] as DriveFileData[];
    const parentFolderId = 'parent123';

    (newStorageService.checkDuplicatedFiles as jest.Mock).mockResolvedValue({ existentFiles: [] });

    const result = await getUniqueFilename(filename, extension, duplicatedFiles, parentFolderId);

    expect(result).toBe(filename);
    expect(newStorageService.checkDuplicatedFiles).toHaveBeenCalledWith(parentFolderId, [
      { plainName: filename, type: extension },
    ]);
    expect(renameIfNeededSpy).toHaveBeenCalledWith([], filename, extension);
  });

  it('should rename the file if duplicates exist', async () => {
    const filename = 'TestFile';
    const extension = 'txt';
    const duplicatedFiles = [{ name: 'TestFile.txt', plainName: 'TestFile', type: 'txt' }] as DriveFileData[];
    const parentFolderId = 'parent123';

    (newStorageService.checkDuplicatedFiles as jest.Mock)
      .mockResolvedValueOnce({ existentFiles: [{ plainName: 'TestFile', type: 'txt' }] })
      .mockResolvedValueOnce({ existentFiles: [] });

    const result = await getUniqueFilename(filename, extension, duplicatedFiles, parentFolderId);

    expect(result).toBe('TestFile (1)');
    expect(newStorageService.checkDuplicatedFiles).toHaveBeenCalledTimes(2);
    expect(renameIfNeededSpy).toHaveBeenCalledTimes(2);
  });

  it('should handle multiple renames if necessary', async () => {
    const filename = 'TestFile';
    const extension = 'txt';
    const duplicatedFiles = [
      { name: 'TestFile.txt', plainName: 'TestFile', type: 'txt' },
      { name: 'TestFile (1).txt', plainName: 'TestFile (1)', type: 'txt' },
    ] as DriveFileData[];
    const parentFolderId = 'parent123';

    (newStorageService.checkDuplicatedFiles as jest.Mock)
      .mockResolvedValueOnce({ existentFiles: [{ plainName: 'TestFile', type: 'txt' }] })
      .mockResolvedValueOnce({ existentFiles: [{ plainName: 'TestFile (1)', type: 'txt' }] })
      .mockResolvedValueOnce({ existentFiles: [] });

    const result = await getUniqueFilename(filename, extension, duplicatedFiles, parentFolderId);

    expect(result).toBe('TestFile (2)');
    expect(newStorageService.checkDuplicatedFiles).toHaveBeenCalledTimes(3);
    expect(renameIfNeededSpy).toHaveBeenCalledTimes(3);
  });

  it('should handle files with different extensions', async () => {
    const filename = 'TestFile';
    const extension = 'txt';
    const duplicatedFiles = [
      { name: 'TestFile.txt', plainName: 'TestFile', type: 'txt' },
      { name: 'TestFile.pdf', plainName: 'TestFile', type: 'pdf' },
    ] as DriveFileData[];
    const parentFolderId = 'parent123';

    (newStorageService.checkDuplicatedFiles as jest.Mock)
      .mockResolvedValueOnce({ existentFiles: [{ plainName: 'TestFile', type: 'txt' }] })
      .mockResolvedValueOnce({ existentFiles: [] });

    const result = await getUniqueFilename(filename, extension, duplicatedFiles, parentFolderId);

    expect(result).toBe('TestFile (1)');
    expect(newStorageService.checkDuplicatedFiles).toHaveBeenCalledTimes(2);
    expect(renameIfNeededSpy).toHaveBeenCalledTimes(2);
  });
});
