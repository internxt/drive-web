import { afterEach, describe, expect, test, vi } from 'vitest';
import { FlatFolderZip } from '../../core/services/zip.service';
import { addAllFoldersToZip, addAllSharedFoldersToZip } from './foldersZip.service';

class MockFlatFolderZip {
  public zip: any;

  constructor() {
    this.zip = {
      addFolder: vi.fn(),
    };
  }

  addFolder(name: string): void {
    this.zip.addFolder(name);
  }
}

describe('foldersZip', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('addAllSharedFoldersToZip', () => {
    const foldersPage1 = [{ name: 'folder1' }, { name: 'folder2' }];
    const foldersPage2 = [{ name: 'folder3' }, { name: 'folder4' }];
    const foldersPage3 = [{ name: 'folder5' }];

    const iterator = {
      next: vi
        .fn()
        .mockReturnValueOnce({ value: foldersPage1, done: false, token: 'token1' })
        .mockReturnValueOnce({ value: foldersPage2, done: false, token: 'token2' })
        .mockReturnValueOnce({ value: foldersPage3, done: true, token: 'token3' }),
    };

    test('should add all shared folders to the zip correctly', async () => {
      const zip = new MockFlatFolderZip();
      const addFolder = vi.spyOn(zip.zip, 'addFolder');
      const result = await addAllSharedFoldersToZip('/path/to/folders', iterator, zip as unknown as FlatFolderZip);
      const allFoldersLength = foldersPage1.length + foldersPage2.length + foldersPage3.length;

      expect(addFolder).toHaveBeenCalledTimes(allFoldersLength);
      expect(addFolder).toHaveBeenCalledWith('/path/to/folders/folder1');
      expect(addFolder).toHaveBeenCalledWith('/path/to/folders/folder2');
      expect(addFolder).toHaveBeenCalledWith('/path/to/folders/folder3');
      expect(addFolder).toHaveBeenCalledWith('/path/to/folders/folder4');
      expect(addFolder).toHaveBeenCalledWith('/path/to/folders/folder5');
      expect(result.folders).toEqual([...foldersPage1, ...foldersPage2, ...foldersPage3]);
      expect(result.token).toEqual('token3');
    });

    test('should handle empty iterator correctly', async () => {
      const emptyIterator = { next: vi.fn().mockReturnValue({ value: [], done: true, token: 'token' }) };
      const zip = new MockFlatFolderZip();
      const addFolder = vi.spyOn(zip.zip, 'addFolder');

      const result = await addAllSharedFoldersToZip('/path/to/folders', emptyIterator, zip as unknown as FlatFolderZip);

      expect(addFolder).not.toHaveBeenCalled();
      expect(result.folders).toEqual([]);
      expect(result.token).toEqual('token');
    });
  });

  describe('addAllFoldersToZip', () => {
    const foldersPage1 = [{ name: 'folder1' }, { name: 'folder2' }];
    const foldersPage2 = [{ name: 'folder3' }, { name: 'folder4' }];
    const foldersPage3 = [];

    const iterator = {
      next: vi
        .fn()
        .mockReturnValueOnce({ value: foldersPage1, done: false })
        .mockReturnValueOnce({ value: foldersPage2, done: false })
        .mockReturnValueOnce({ value: foldersPage3, done: true }),
    };
    const zip = new MockFlatFolderZip();

    test('should add all folders to the zip correctly', async () => {
      const addFolder = vi.spyOn(zip.zip, 'addFolder');
      const result = await addAllFoldersToZip('/path/to/folders', iterator, zip as unknown as FlatFolderZip);
      const allFoldersLength = foldersPage1.length + foldersPage2.length + foldersPage3.length;

      expect(addFolder).toHaveBeenCalledTimes(allFoldersLength);
      expect(addFolder).toHaveBeenCalledWith('/path/to/folders/folder1');
      expect(addFolder).toHaveBeenCalledWith('/path/to/folders/folder2');
      expect(addFolder).toHaveBeenCalledWith('/path/to/folders/folder3');
      expect(addFolder).toHaveBeenCalledWith('/path/to/folders/folder4');
      expect(result).toEqual([...foldersPage1, ...foldersPage2, ...foldersPage3]);
    });

    test('should handle empty iterator correctly', async () => {
      const emptyIterator = { next: vi.fn().mockReturnValue({ value: [], done: true }) };
      const addFolder = vi.spyOn(zip.zip, 'addFolder');

      const result = await addAllFoldersToZip('/path/to/folders', emptyIterator, zip as unknown as FlatFolderZip);

      expect(addFolder).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
});
