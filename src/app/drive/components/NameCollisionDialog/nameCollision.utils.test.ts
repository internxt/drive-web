import { describe, expect, test } from 'vitest';
import { getDriveItemData } from 'testUtils/fixtures/drive.fixtures';
import { CollisionGroup } from 'app/store/slices/storage/storage.model';
import { IRoot } from 'app/store/slices/storage/types';
import {
  CollisionItem,
  findExistingItemFor,
  findPendingGroupIndex,
  getCollisionPairs,
  getNameSeriesKey,
  getRemainingGroups,
  groupByNameSeries,
  isFolderUpload,
  isNameTakenBy,
  splitReplacingPairs,
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
    ['an uploaded folder with the same name', getRoot('report'), existingFolder],
    ['an uploaded folder whose name only matches a file', getRoot('README'), undefined],
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

describe('splitReplacingPairs', () => {
  test('when several items collide with the same existing item, then only the first one replaces it and the rest are left over', () => {
    const first = getDriveItemData({ uuid: 'first', plainName: 'report', type: 'pdf' });
    const second = getDriveItemData({ uuid: 'second', plainName: 'report', type: 'pdf' });
    const folder = getDriveItemData({ uuid: 'moved-folder', plainName: 'report', isFolder: true });

    expect(splitReplacingPairs(getCollisionPairs([first, folder, second], existingItems))).toEqual({
      replacingPairs: [
        { item: first, existing: existingFile },
        { item: folder, existing: existingFolder },
      ],
      leftoverItems: [second],
    });
  });
});

describe('isNameTakenBy', () => {
  const movedFile = getDriveItemData({ plainName: 'draft', type: 'pdf', isFolder: false });
  const movedFolder = getDriveItemData({ plainName: 'draft', type: null as never, isFolder: true });

  test.each<[string, string, ReturnType<typeof getDriveItemData>, boolean]>([
    ['a file of the same extension holds the name', 'report', movedFile, true],
    ['only a file of another extension holds the name', 'report', { ...movedFile, type: 'docx' }, false],
    ['a folder holds the name wanted by a folder', 'report', movedFolder, true],
    ['only a file holds the name wanted by a folder', 'README', movedFolder, false],
    ['nothing holds the name', 'draft', movedFile, false],
  ])('when %s, then it is reported accordingly', (_, name, item, expected) => {
    expect(isNameTakenBy(name, item, existingItems)).toBe(expected);
  });
});

describe('getNameSeriesKey', () => {
  const file = getDriveItemData({ type: 'pdf', isFolder: false });
  const folder = getDriveItemData({ type: null as never, isFolder: true });

  test.each<[string, ReturnType<typeof getDriveItemData>, string, boolean]>([
    ['the same name and extension', file, 'report', true],
    ['the same name with an increment', file, 'report (1)', true],
    ['the same name in another casing', { ...file, type: 'PDF' }, 'Report (12)', true],
    ['another name', file, 'other', false],
    ['the same name with another extension', { ...file, type: 'docx' }, 'report', false],
    ['the same name as a folder', folder, 'report', false],
    ['an increment that is not at the end of the name', file, 'report (1) final', false],
  ])('when a file is compared with %s, then the series match is reported', (_, item, name, expected) => {
    const isSameSeries = getNameSeriesKey(item, name) === getNameSeriesKey(file, 'report');

    expect(isSameSeries).toBe(expected);
  });

  test('when two folders share a name and only differ in the increment and the type, then they belong to the same series', () => {
    const typedFolder = { ...folder, type: 'pdf' };

    expect(getNameSeriesKey(typedFolder, 'report (2)')).toBe(getNameSeriesKey(folder, 'report'));
  });
});

describe('groupByNameSeries', () => {
  test('when some items belong to the same name series, then they are grouped together in their given order', () => {
    const first = getDriveItemData({ uuid: 'first', name: 'report', type: 'pdf', isFolder: false });
    const other = getDriveItemData({ uuid: 'other', name: 'other', type: 'pdf', isFolder: false });
    const second = getDriveItemData({ uuid: 'second', name: 'report (1)', type: 'pdf', isFolder: false });

    const series = groupByNameSeries([first, other, second], (item) => item.name);

    expect(series).toEqual([[first, second], [other]]);
  });
});
