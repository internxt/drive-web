import { describe, expect, it } from 'vitest';
import { DriveItemData } from 'app/drive/types';
import { AdvancedSharedItem } from 'app/share/types';
import { getLinkExpirationDate, removeDuplicates } from './driveItemsUtils';

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

describe('getLinkExpirationDate', () => {
  const linkExpirationDate = '2026-10-31T22:59:59.999Z';

  it('When the item comes from the shared list, then it returns its link expiration date', () => {
    expect(getLinkExpirationDate({ linkExpirationDate })).toBe(linkExpirationDate);
  });

  it('When the item comes from the drive list, then it returns the expiration date of its public sharing', () => {
    const sharings = [
      { type: 'private', id: 'private-sharing-id', expirationAt: null },
      { type: 'public', id: 'public-sharing-id', expirationAt: linkExpirationDate },
    ];

    expect(getLinkExpirationDate({ sharings })).toBe(linkExpirationDate);
  });

  it('When the public sharing never expires, then it returns undefined', () => {
    const sharings = [{ type: 'public', id: 'public-sharing-id', expirationAt: null }];

    expect(getLinkExpirationDate({ sharings })).toBeUndefined();
  });

  it('When the item is not shared, then it returns undefined', () => {
    expect(getLinkExpirationDate({})).toBeUndefined();
  });
});
