import { describe, expect, it } from 'vitest';
import renameFolderIfNeeded from './renameFolderIfNeeded';

describe('renameFolderIfNeeded', () => {
  it('should return the original name when there are no conflicts', () => {
    const items = [{ name: 'Folder1' }, { name: 'Folder2' }];
    const folderName = 'NewFolder';

    const [needsRename, index, newName] = renameFolderIfNeeded(items, folderName);

    expect(needsRename).toBe(false);
    expect(index).toBe(0);
    expect(newName).toBe('NewFolder');
  });

  it('should rename the folder when there is a conflict', () => {
    const items = [{ name: 'NewFolder' }, { name: 'Folder2' }];
    const folderName = 'NewFolder';

    const [needsRename, index, newName] = renameFolderIfNeeded(items, folderName);

    expect(needsRename).toBe(true);
    expect(index).toBe(1);
    expect(newName).toBe('NewFolder (1)');
  });

  it('should handle multiple conflicts and increment correctly', () => {
    const items = [{ name: 'NewFolder' }, { name: 'NewFolder (1)' }, { name: 'NewFolder (2)' }, { name: 'Folder2' }];
    const folderName = 'NewFolder';

    const [needsRename, index, newName] = renameFolderIfNeeded(items, folderName);

    expect(needsRename).toBe(true);
    expect(index).toBe(3);
    expect(newName).toBe('NewFolder (3)');
  });

  it('should handle non-sequential numbering', () => {
    const items = [{ name: 'NewFolder' }, { name: 'NewFolder (1)' }, { name: 'NewFolder (3)' }, { name: 'Folder2' }];
    const folderName = 'NewFolder';

    const [needsRename, index, newName] = renameFolderIfNeeded(items, folderName);

    expect(needsRename).toBe(true);
    expect(index).toBe(4);
    expect(newName).toBe('NewFolder (4)');
  });

  it('should handle folder names with existing parentheses', () => {
    const items = [{ name: 'NewFolder (test)' }, { name: 'Folder2' }];
    const folderName = 'NewFolder (test)';

    const [needsRename, index, newName] = renameFolderIfNeeded(items, folderName);

    expect(needsRename).toBe(true);
    expect(index).toBe(1);
    expect(newName).toBe('NewFolder (test) (1)');
  });

  it('should handle folder names with existing numbers', () => {
    const items = [{ name: 'NewFolder 123' }, { name: 'Folder2' }];
    const folderName = 'NewFolder 123';

    const [needsRename, index, newName] = renameFolderIfNeeded(items, folderName);

    expect(needsRename).toBe(true);
    expect(index).toBe(1);
    expect(newName).toBe('NewFolder 123 (1)');
  });
});
