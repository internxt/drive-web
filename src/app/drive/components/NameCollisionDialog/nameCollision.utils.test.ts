import { describe, expect, test } from 'vitest';
import { getDriveItemData } from 'testUtils/fixtures/drive.fixtures';
import { CollisionGroup } from 'app/store/slices/storage/storage.model';
import { IRoot } from 'app/store/slices/storage/types';
import {
  CollisionItem,
  findExistingItemFor,
  findPendingGroupIndex,
  getCollisionPairs,
  getRemainingGroups,
  isFolderUpload,
} from './nameCollision.utils';

const getRoot = (name = 'Photos'): IRoot => ({
  name,
  folderId: null,
  childrenFiles: [],
  childrenFolders: [],
  fullPathEdited: `/${name}`,
});

const getGroup = (overrides: Partial<CollisionGroup> = {}): CollisionGroup => ({
  destinationUuid: 'destination-uuid',
  duplicatedItems: [],
  existingItems: [],
  unrepeatedItems: [],
  ...overrides,
});

const existingFile = getDriveItemData({ uuid: 'file', plainName: 'report', type: 'pdf', isFolder: false });
const existingFolder = getDriveItemData({ uuid: 'folder', plainName: 'report', type: null as never, isFolder: true });
const existingNamedByName = getDriveItemData({
  uuid: 'legacy',
  name: 'README',
  plainName: undefined,
  type: null as never,
});
const existingItems = [existingFile, existingFolder, existingNamedByName];

describe('isFolderUpload', () => {
  test('when the item has an edited full path, then it is an uploaded folder', () => {
    expect(isFolderUpload(getRoot())).toBe(true);
    expect(isFolderUpload(new File([''], 'notes.txt'))).toBe(false);
    expect(isFolderUpload(getDriveItemData({ isFolder: true }))).toBe(false);
  });
});

describe('findExistingItemFor', () => {
  test.each<[string, CollisionItem, ReturnType<typeof getDriveItemData> | undefined]>([
    ['an uploaded folder with the same name', getRoot('report'), existingFile],
    ['an uploaded file with the same name and extension', new File([''], 'report.pdf'), existingFile],
    ['an uploaded file with the same name but another extension', new File([''], 'report.docx'), undefined],
    [
      'an uploaded file without extension against a legacy item named by name',
      new File([''], 'README'),
      existingNamedByName,
    ],
    ['a moved file with the same name and type', getDriveItemData({ plainName: 'report', type: 'pdf' }), existingFile],
    [
      'a moved file with the same name but another type',
      getDriveItemData({ plainName: 'report', type: 'docx' }),
      undefined,
    ],
    [
      'a moved folder with the same name regardless of type',
      getDriveItemData({ plainName: 'report', type: 'x', isFolder: true }),
      existingFolder,
    ],
    [
      'a moved item without plainName',
      getDriveItemData({ name: 'README', plainName: undefined, type: null as never }),
      existingNamedByName,
    ],
  ])('when given %s, then the matching item is returned', (_, item, expected) => {
    expect(findExistingItemFor(item, existingItems)).toBe(expected);
  });
});

describe('getCollisionPairs', () => {
  test('when only some items collide, then only those are paired with their existing item', () => {
    const matched = new File([''], 'report.pdf');

    expect(getCollisionPairs([matched, new File([''], 'unknown.txt')], existingItems)).toEqual([
      { item: matched, existing: existingFile },
    ]);
  });
});

describe('findPendingGroupIndex', () => {
  test('when several groups exist, then the first one with duplicated items is returned', () => {
    const pending = getGroup({ duplicatedItems: [new File([''], 'a.txt')] });

    expect(findPendingGroupIndex([getGroup(), pending, getGroup()])).toBe(1);
    expect(findPendingGroupIndex([getGroup()])).toBe(-1);
  });
});

describe('getRemainingGroups', () => {
  const otherGroup = getGroup({ destinationUuid: 'other', duplicatedItems: [new File([''], 'c.txt')] });

  test('when the handled group still has items, then it keeps the rest and drops the resolved existing item', () => {
    const [first, second] = [new File([''], 'a.txt'), new File([''], 'b.txt')];
    const groups = [
      getGroup({ duplicatedItems: [first, second], existingItems: [existingFile, existingFolder] }),
      otherGroup,
    ];

    expect(getRemainingGroups(groups, 0, existingFile)).toEqual([
      { ...groups[0], duplicatedItems: [second], existingItems: [existingFolder] },
      otherGroup,
    ]);
  });

  test('when the handled group had a single item, then it is dropped from the result', () => {
    const groups = [
      getGroup({ duplicatedItems: [new File([''], 'a.txt')], existingItems: [existingFile] }),
      otherGroup,
    ];

    expect(getRemainingGroups(groups, 0, undefined)).toEqual([otherGroup]);
  });
});
