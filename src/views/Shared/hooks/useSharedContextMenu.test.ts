/**
 * @jest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import useSharedContextMenu from './useSharedContextMenu';
import { AdvancedSharedItem } from 'app/share/types';
import * as DriveItemContextMenu from 'views/Drive/components/DriveExplorer/DriveExplorerList/DriveItemContextMenu';

vi.mock('views/Drive/components/DriveExplorer/DriveExplorerList/DriveItemContextMenu');

describe('useSharedContextMenu', () => {
  const mockActions = {
    downloadItem: vi.fn(),
    onOpenStopSharingDialog: vi.fn(),
    copyLink: vi.fn(),
    openShareAccessSettings: vi.fn(),
    showDetails: vi.fn(),
    renameItem: vi.fn(),
    moveItem: vi.fn(),
    openPreview: vi.fn(),
  };

  const mockIsItemOwnedByCurrentUser = vi.fn();

  const createItem = (overrides: Partial<AdvancedSharedItem> = {}): AdvancedSharedItem =>
    ({
      id: 1,
      uuid: 'test-uuid',
      name: 'test-item',
      isFolder: false,
      credentials: { networkUser: 'user', networkPass: 'pass' },
      sharingType: 'private',
      encryptedPassword: null,
      user: { uuid: 'user-uuid-123', id: 1, email: 'test@example.com' },
      ...overrides,
    }) as AdvancedSharedItem;

  const render = (items: AdvancedSharedItem[], isOwned: boolean, isViewer: boolean, isRoot = false) =>
    renderHook(() =>
      useSharedContextMenu({
        selectedItems: items,
        sharedContextMenuActions: mockActions,
        isItemsOwnedByCurrentUser: isOwned,
        isItemOwnedByCurrentUser: mockIsItemOwnedByCurrentUser,
        isRootFolder: isRoot,
        isCurrentUserViewer: isViewer,
      }),
    );

  beforeEach(() => vi.clearAllMocks());

  describe('Multiple items', () => {
    it('should include moveToTrash only when owned by user', () => {
      vi.mocked(DriveItemContextMenu.contextMenuMultipleSharedViewAFS).mockReturnValue([]);
      const items = [createItem(), createItem({ id: 2 })];

      render(items, true, false);
      expect(DriveItemContextMenu.contextMenuMultipleSharedViewAFS).toHaveBeenCalledWith({
        downloadItem: mockActions.downloadItem,
        moveToTrash: mockActions.onOpenStopSharingDialog,
      });

      vi.clearAllMocks();
      render(items, false, false);
      expect(DriveItemContextMenu.contextMenuMultipleSharedViewAFS).toHaveBeenCalledWith({
        downloadItem: mockActions.downloadItem,
        moveToTrash: undefined,
      });
    });
  });

  describe('Single folder', () => {
    beforeEach(() => {
      vi.mocked(DriveItemContextMenu.contextMenuDriveFolderSharedAFS).mockReturnValue([]);
      mockIsItemOwnedByCurrentUser.mockReturnValue(true);
    });

    it('should include all owner options in root folder', () => {
      render([createItem({ isFolder: true })], true, false, true);

      expect(DriveItemContextMenu.contextMenuDriveFolderSharedAFS).toHaveBeenCalledWith({
        copyLink: mockActions.copyLink,
        showDetails: mockActions.showDetails,
        downloadItem: mockActions.downloadItem,
        renameItem: mockActions.renameItem,
        openShareAccessSettings: mockActions.openShareAccessSettings,
        moveItem: mockActions.moveItem,
        moveToTrash: mockActions.onOpenStopSharingDialog,
      });
    });

    it('should exclude openShareAccessSettings in non-root folder', () => {
      render([createItem({ isFolder: true })], true, false, false);
      expect(DriveItemContextMenu.contextMenuDriveFolderSharedAFS).toHaveBeenCalledWith(
        expect.objectContaining({ openShareAccessSettings: undefined }),
      );
    });

    it('should only include basic options when not owner', () => {
      mockIsItemOwnedByCurrentUser.mockReturnValue(false);
      render([createItem({ isFolder: true })], false, false, false);

      expect(DriveItemContextMenu.contextMenuDriveFolderSharedAFS).toHaveBeenCalledWith({
        copyLink: mockActions.copyLink,
        showDetails: mockActions.showDetails,
        downloadItem: mockActions.downloadItem,
        renameItem: mockActions.renameItem,
      });
    });
  });

  describe('Single file', () => {
    beforeEach(() => {
      vi.mocked(DriveItemContextMenu.contextMenuDriveItemSharedAFS).mockReturnValue([]);
      mockIsItemOwnedByCurrentUser.mockReturnValue(true);
    });

    it('should include all owner options in root folder', () => {
      render([createItem()], true, false, true);

      expect(DriveItemContextMenu.contextMenuDriveItemSharedAFS).toHaveBeenCalledWith(
        expect.objectContaining({
          openPreview: mockActions.openPreview,
          downloadItem: expect.any(Function),
          renameItem: mockActions.renameItem,
          openShareAccessSettings: mockActions.openShareAccessSettings,
          moveToTrash: mockActions.onOpenStopSharingDialog,
        }),
      );
    });

    it('should wrap downloadItem and call original action', () => {
      const item = createItem();
      render([item], true, false, true);

      const callArgs = vi.mocked(DriveItemContextMenu.contextMenuDriveItemSharedAFS).mock.calls[0][0];
      callArgs.downloadItem(item);
      expect(mockActions.downloadItem).toHaveBeenCalledWith(item);
    });

    it('should exclude openShareAccessSettings in non-root folder', () => {
      render([createItem()], true, false, false);
      expect(DriveItemContextMenu.contextMenuDriveItemSharedAFS).toHaveBeenCalledWith(
        expect.objectContaining({ openShareAccessSettings: undefined }),
      );
    });

    it('should only include basic options when not owner', () => {
      mockIsItemOwnedByCurrentUser.mockReturnValue(false);
      render([createItem()], false, false, false);

      expect(DriveItemContextMenu.contextMenuDriveItemSharedAFS).toHaveBeenCalledWith(
        expect.objectContaining({
          openPreview: mockActions.openPreview,
          downloadItem: expect.any(Function),
          renameItem: mockActions.renameItem,
        }),
      );
    });

    it('should handle undefined user', () => {
      mockIsItemOwnedByCurrentUser.mockReturnValue(false);
      render([createItem({ user: undefined })], false, false, false);
      expect(mockIsItemOwnedByCurrentUser).toHaveBeenCalledWith(undefined);
    });
  });

  describe('Edge cases', () => {
    it('should return undefined when no items selected', () => {
      const { result } = render([], false, false);
      expect(result.current).toBeUndefined();
    });

    it('should recompute on dependency changes', () => {
      vi.mocked(DriveItemContextMenu.contextMenuDriveItemSharedAFS).mockReturnValue([]);
      mockIsItemOwnedByCurrentUser.mockReturnValue(true);

      const { rerender } = renderHook(
        ({ items, isRoot, isViewer }) =>
          useSharedContextMenu({
            selectedItems: items,
            sharedContextMenuActions: mockActions,
            isItemsOwnedByCurrentUser: true,
            isItemOwnedByCurrentUser: mockIsItemOwnedByCurrentUser,
            isRootFolder: isRoot,
            isCurrentUserViewer: isViewer,
          }),
        { initialProps: { items: [createItem()], isRoot: false, isViewer: false } },
      );

      expect(DriveItemContextMenu.contextMenuDriveItemSharedAFS).toHaveBeenCalledTimes(1);

      rerender({ items: [createItem({ id: 2 })], isRoot: false, isViewer: false });
      expect(DriveItemContextMenu.contextMenuDriveItemSharedAFS).toHaveBeenCalledTimes(2);

      rerender({ items: [createItem({ id: 2 })], isRoot: true, isViewer: false });
      expect(DriveItemContextMenu.contextMenuDriveItemSharedAFS).toHaveBeenCalledTimes(3);

      rerender({ items: [createItem({ id: 2 })], isRoot: true, isViewer: true });
      expect(DriveItemContextMenu.contextMenuDriveItemSharedAFS).toHaveBeenCalledTimes(4);
    });
  });
});
