import { describe, expect, test } from 'vitest';
import { getDriveItemData } from 'testUtils/fixtures/drive.fixtures';
import { IRoot } from 'app/store/slices/storage/types';
import { CollisionItem, findExistingItemFor, getCollisionPairs, isFolderUpload } from './nameCollision.utils';

const getRoot = (name = 'Photos'): IRoot => ({
  name,
  folderId: null,
  childrenFiles: [],
  childrenFolders: [],
  fullPathEdited: `/${name}`,
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
