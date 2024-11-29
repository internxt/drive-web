import { describe, expect, it } from 'vitest';
import { DriveItemData } from '../drive/types';
import { AdvancedSharedItem } from '../share/types';
import { removeDuplicates } from './driveItemsUtils';

describe('removeDuplicates', () => {
  const sharedItems = [
    { id: 1, name: 'Item1', updatedAt: '2022-01-01', type: 'shared', uuid: 'uuid1' },
    { id: 2, name: 'Item2', updatedAt: '2022-01-02', type: 'shared', uuid: 'uuid2' },
    { id: 1, name: 'Item1', updatedAt: '2022-01-01', type: 'shared', uuid: 'uuid1' }, // Duplicated item
  ] as unknown as AdvancedSharedItem[];

  const driveItems = [
    { id: 1, name: 'Item1', updatedAt: '2022-01-01', type: 'drive', uuid: 'uuid1' },
    { id: 3, name: 'Item3', updatedAt: '2022-01-03', type: 'drive', uuid: 'uuid3' },
    { id: 1, name: 'Item1', updatedAt: '2022-01-01', type: 'drive', uuid: 'uuid1' }, // Duplicated item
  ] as unknown as DriveItemData[];

  it('removes duplicates from shared items', () => {
    const result = removeDuplicates(sharedItems);
    expect(result).toHaveLength(2);
    expect(result).toEqual([
      { id: 1, name: 'Item1', updatedAt: '2022-01-01', type: 'shared', uuid: 'uuid1' },
      { id: 2, name: 'Item2', updatedAt: '2022-01-02', type: 'shared', uuid: 'uuid2' },
    ]);
  });

  it('removes duplicates from drive items', () => {
    const result = removeDuplicates(driveItems);
    expect(result).toHaveLength(2);
    expect(result).toEqual([
      { id: 1, name: 'Item1', updatedAt: '2022-01-01', type: 'drive', uuid: 'uuid1' },
      { id: 3, name: 'Item3', updatedAt: '2022-01-03', type: 'drive', uuid: 'uuid3' },
    ]);
  });

  it('handles an empty list', () => {
    const result = removeDuplicates([]);
    expect(result).toHaveLength(0);
  });
});
