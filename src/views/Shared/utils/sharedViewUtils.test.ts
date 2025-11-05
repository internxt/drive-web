/**
 * @jest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdvancedSharedItem, UserRoles } from '../../../app/share/types';
import * as utils from './sharedViewUtils';
import shareService from '../../../app/share/services/share.service';
import errorService from '../../../app/core/services/error.service';

vi.mock('../../../app/share/services/share.service');
vi.mock('../../../app/core/services/error.service');

describe('sharedViewUtils', () => {
  const item = (overrides = {}) =>
    ({
      id: 1,
      name: 'test',
      size: '100',
      isFolder: false,
      user: { uuid: 'u1', email: 'test@test.com' },
      ...overrides,
    }) as AdvancedSharedItem;

  beforeEach(() => vi.clearAllMocks());

  describe('isCurrentUserViewer', () => {
    it('should return true only for Reader role', () => {
      expect(utils.isCurrentUserViewer(UserRoles.Reader)).toBe(true);
      expect(utils.isCurrentUserViewer(UserRoles.Editor)).toBe(false);
      expect(utils.isCurrentUserViewer(null)).toBe(false);
    });
  });

  describe('isItemOwnedByCurrentUser', () => {
    it('should return true when UUIDs match', () => {
      expect(utils.isItemOwnedByCurrentUser('uuid1', 'uuid1')).toBe(true);
      expect(utils.isItemOwnedByCurrentUser('uuid1', 'uuid2')).toBe(false);
    });

    it('should return false when either UUID is missing', () => {
      expect(utils.isItemOwnedByCurrentUser(undefined, 'uuid1')).toBe(false);
      expect(utils.isItemOwnedByCurrentUser('uuid1')).toBe(false);
    });
  });

  describe('isItemsOwnedByCurrentUser', () => {
    it('should check ownership across multiple items', () => {
      const items = [item({ user: { uuid: 'u1' } }), item({ user: { uuid: 'u2' } })];
      expect(utils.isItemsOwnedByCurrentUser(items, 'u1')).toBe(true);
      expect(utils.isItemsOwnedByCurrentUser(items, 'u3')).toBe(false);
    });

    it('should use clickedItemUserUUID fallback', () => {
      const items = [item({ user: undefined }), item({ user: { uuid: 'u2' } })];
      expect(utils.isItemsOwnedByCurrentUser(items, 'u1', 'u1')).toBe(true);
    });

    it('should return false for edge cases', () => {
      expect(utils.isItemsOwnedByCurrentUser([item()], 'u1')).toBe(false);
      expect(utils.isItemsOwnedByCurrentUser([item(), item()])).toBe(false);
    });
  });

  describe('getFolderUserRole', () => {
    it('should call callback with lowercase role name', async () => {
      const cb = vi.fn();
      vi.mocked(shareService.getUserRoleOfSharedFolder).mockResolvedValue({ name: 'EDITOR' } as any);
      await utils.getFolderUserRole({ sharingId: 'id1', onObtainUserRoleCallback: cb });
      expect(cb).toHaveBeenCalledWith('editor');
    });

    it('should handle missing role name and errors', async () => {
      const cb = vi.fn();
      vi.mocked(shareService.getUserRoleOfSharedFolder).mockResolvedValue({ name: undefined } as any);
      await utils.getFolderUserRole({ sharingId: 'id1', onObtainUserRoleCallback: cb });
      expect(cb).not.toHaveBeenCalled();

      const err = new Error('fail');
      vi.mocked(shareService.getUserRoleOfSharedFolder).mockRejectedValue(err);
      await utils.getFolderUserRole({ sharingId: 'id1', onObtainUserRoleCallback: cb });
      expect(errorService.reportError).toHaveBeenCalledWith(err);
    });
  });

  describe('sortSharedItems', () => {
    it('should handle undefined orderBy and prioritize folders', () => {
      const items = [item({ id: 2 }), item({ id: 1 })];
      expect(utils.sortSharedItems(items)).toEqual(items);

      const mixed = [item({ isFolder: false }), item({ isFolder: true })];
      expect(utils.sortSharedItems(mixed, { field: 'name', direction: 'ASC' })[0].isFolder).toBe(true);
    });

    it('should sort by name and size', () => {
      const items = [item({ name: 'c' }), item({ name: 'a' }), item({ name: 'b' })];
      expect(utils.sortSharedItems(items, { field: 'name', direction: 'ASC' }).map((i) => i.name)).toEqual([
        'a',
        'b',
        'c',
      ]);
      expect(utils.sortSharedItems(items, { field: 'name', direction: 'DESC' }).map((i) => i.name)).toEqual([
        'c',
        'b',
        'a',
      ]);

      const sizes = [item({ size: '200' }), item({ size: '50' }), item({ size: '100' })];
      expect(utils.sortSharedItems(sizes, { field: 'size', direction: 'ASC' }).map((i) => i.size)).toEqual([
        '50',
        '100',
        '200',
      ]);
    });

    it('should handle equal values', () => {
      const items = [item({ name: 'same' }), item({ name: 'same', id: 2 })];
      expect(utils.sortSharedItems(items, { field: 'name', direction: 'ASC' })).toHaveLength(2);
    });
  });

  describe('isUserItemOwner', () => {
    it('should check ownership based on conditions', () => {
      expect(utils.isUserItemOwner({ isDriveItem: true, userEmail: 'a@b.com' })).toBe(true);
      expect(utils.isUserItemOwner({ item: undefined, userEmail: 'a@b.com' })).toBe(false);
      expect(utils.isUserItemOwner({ item: item({ user: { email: 'a@b.com' } }), userEmail: 'a@b.com' })).toBe(true);
      expect(utils.isUserItemOwner({ item: item({ user: { email: 'x@y.com' } }), userEmail: 'a@b.com' })).toBe(false);
    });
  });

  describe('getDraggedItemsWithoutFolders', () => {
    const fileEntry = { isFile: true, isDirectory: false, file: vi.fn((cb) => cb(new File(['x'], 't.txt'))) };
    const folderEntry = { isFile: false, isDirectory: true };
    const fileItem = { webkitGetAsEntry: vi.fn(() => fileEntry) } as unknown as DataTransferItem;
    const folderItem = { webkitGetAsEntry: vi.fn(() => folderEntry) } as unknown as DataTransferItem;

    beforeEach(() => {
      fileEntry.file = vi.fn((cb) => cb(new File(['x'], 't.txt')));
    });

    it('should filter files and detect folders', async () => {
      let res = await utils.getDraggedItemsWithoutFolders([fileItem]);
      expect(res).toEqual({ hasFolders: false, filteredItems: [expect.any(File)] });

      res = await utils.getDraggedItemsWithoutFolders([folderItem]);
      expect(res).toEqual({ hasFolders: true, filteredItems: [] });

      res = await utils.getDraggedItemsWithoutFolders([fileItem, folderItem]);
      expect(res.hasFolders).toBe(true);
      expect(res.filteredItems).toHaveLength(1);
    });

    it('should handle errors and null files', async () => {
      fileEntry.file = vi.fn((_success: any, error: any) => error(new Error('fail')));
      const res = await utils.getDraggedItemsWithoutFolders([fileItem]);
      expect(res).toEqual({ filteredItems: [], hasFolders: false });
      expect(errorService.reportError).toHaveBeenCalled();

      const nullEntry = { isFile: true, file: vi.fn((cb: any) => cb(null)) };
      const nullItem = { webkitGetAsEntry: vi.fn(() => nullEntry) } as unknown as DataTransferItem;
      fileEntry.file = vi.fn((cb: any) => cb(new File(['x'], 't.txt')));
      const res2 = await utils.getDraggedItemsWithoutFolders([nullItem, fileItem]);
      expect(res2.filteredItems).toHaveLength(1);
    });
  });
});
