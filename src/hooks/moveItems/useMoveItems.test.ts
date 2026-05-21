import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileStatus } from '@internxt/sdk/dist/drive/storage/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { errorService } from 'services';
import { DriveItemData } from 'app/drive/types';
import { useMoveItems } from './useMoveItems';
import { buildDriveItemData } from '../../../test/unit/fixtures/drive.fixtures';

const {
  mockDispatch,
  mockMoveItemsThunk,
  mockPopItemsToDelete,
  mockSetItemsToMove,
  mockSetIsMoveItemsDialogOpen,
  mockSetMoveDestinationFolderId,
} = vi.hoisted(() => ({
  mockDispatch: vi.fn(),
  mockMoveItemsThunk: vi.fn((payload: unknown) => ({ type: 'moveItemsThunk', payload })),
  mockPopItemsToDelete: vi.fn((items: unknown) => ({ type: 'popItemsToDelete', payload: items })),
  mockSetItemsToMove: vi.fn((items: unknown) => ({ type: 'setItemsToMove', payload: items })),
  mockSetIsMoveItemsDialogOpen: vi.fn((val: unknown) => ({ type: 'setIsMoveItemsDialogOpen', payload: val })),
  mockSetMoveDestinationFolderId: vi.fn((id: unknown) => ({ type: 'setMoveDestinationFolderId', payload: id })),
}));

vi.mock('app/store/hooks', () => ({ useAppDispatch: () => mockDispatch }));
vi.mock('react-redux', () => ({
  useSelector: vi.fn((selector: (s: unknown) => unknown) => selector({ storage: { itemsToMove: [] } })),
}));
vi.mock('i18next', () => ({ default: { t: (key: string) => key }, t: (key: string) => key }));
vi.mock('app/store/slices/storage/storage.thunks', () => ({ default: { moveItemsThunk: mockMoveItemsThunk } }));
vi.mock('app/store/slices/storage/storage.thunks/renameItemsThunk', () => ({
  getCollisionGroups: vi.fn(async (groups: { destinationUuid: string; items: unknown[] }[]) =>
    groups.map(({ destinationUuid, items }) => ({
      destinationUuid,
      duplicatedItems: [],
      existingItems: [],
      unrepeatedItems: items,
    })),
  ),
}));
vi.mock('app/store/slices/storage', () => ({
  storageActions: {
    popItemsToDelete: mockPopItemsToDelete,
    setItemsToMove: mockSetItemsToMove,
    setMoveDestinationFolderId: mockSetMoveDestinationFolderId,
  },
  storageSelectors: {},
  setItemsToMove: mockSetItemsToMove,
  default: {},
}));
vi.mock('app/store/slices/ui', () => ({
  uiActions: { setIsMoveItemsDialogOpen: mockSetIsMoveItemsDialogOpen },
}));

const buildItemWithExistingParent = (overrides: Partial<DriveItemData> = {}): DriveItemData =>
  buildDriveItemData({
    parent: { uuid: 'parent-uuid', plainName: 'My Folder', status: FileStatus.EXISTS },
    ...overrides,
  });

const buildItemWithDeletedParent = (overrides: Partial<DriveItemData> = {}): DriveItemData =>
  buildDriveItemData({
    parent: { uuid: 'parent-uuid', plainName: 'Deleted Folder', status: FileStatus.TRASHED },
    ...overrides,
  });

describe('Restore items from trash', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDispatch.mockImplementation((action: unknown) => action);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Single item restore', () => {
    test('When the original folder still exists, then the item is moved there directly', async () => {
      const item = buildItemWithExistingParent();
      const { result } = renderHook(() => useMoveItems());

      await act(async () => {
        await result.current.restoreItemFromTrash(item);
      });

      expect(mockMoveItemsThunk).toHaveBeenCalledWith(expect.objectContaining({ destinationFolderId: 'parent-uuid' }));
    });

    test('When the original folder still exists, then the item is removed from the trash list', async () => {
      const item = buildItemWithExistingParent();
      const { result } = renderHook(() => useMoveItems());

      await act(async () => {
        await result.current.restoreItemFromTrash(item);
      });

      expect(mockPopItemsToDelete).toHaveBeenCalledWith([item]);
    });

    test('When the original folder still exists, then a success notification is shown', async () => {
      const item = buildItemWithExistingParent();
      const { result } = renderHook(() => useMoveItems());
      const notificationsSpy = vi.spyOn(notificationsService, 'show');

      await act(async () => {
        await result.current.restoreItemFromTrash(item);
      });

      expect(notificationsSpy).toHaveBeenCalledWith(expect.objectContaining({ type: ToastType.Success }));
    });

    test('When the original folder no longer exists, then the move dialog is opened so the user can pick a destination', async () => {
      const item = buildItemWithDeletedParent();
      const { result } = renderHook(() => useMoveItems());

      await act(async () => {
        await result.current.restoreItemFromTrash(item);
      });

      expect(mockSetItemsToMove).toHaveBeenCalledWith([item]);
      expect(mockSetIsMoveItemsDialogOpen).toHaveBeenCalledWith(true);
    });

    test('When the original folder no longer exists, then no success notification is shown', async () => {
      const item = buildItemWithDeletedParent();
      const { result } = renderHook(() => useMoveItems());
      const notificationsSpy = vi.spyOn(notificationsService, 'show');

      await act(async () => {
        await result.current.restoreItemFromTrash(item);
      });

      expect(notificationsSpy).not.toHaveBeenCalled();
    });

    test('When the restore fails, then an error notification is shown', async () => {
      const item = buildItemWithExistingParent();
      mockDispatch.mockImplementation(() => {
        throw new Error('Network error');
      });
      const { result } = renderHook(() => useMoveItems());
      const notificationsSpy = vi.spyOn(notificationsService, 'show');
      vi.spyOn(errorService, 'castError').mockReturnValue({ message: 'Network error', requestId: undefined } as any);

      await act(async () => {
        await result.current.restoreItemFromTrash(item);
      });

      expect(notificationsSpy).toHaveBeenCalledWith(expect.objectContaining({ type: ToastType.Error }));
    });
  });

  describe('Multiple items restore', () => {
    test('When all items have their original folder available, then all are restored and a success notification is shown', async () => {
      const items = [
        buildItemWithExistingParent({
          parent: { uuid: 'parent-uuid-1', status: FileStatus.EXISTS, plainName: 'My First Folder' },
        }),
        buildItemWithExistingParent({
          parent: { uuid: 'parent-uuid-1', status: FileStatus.EXISTS, plainName: 'My Second Folder' },
        }),
      ];
      const { result } = renderHook(() => useMoveItems());
      const notificationsSpy = vi.spyOn(notificationsService, 'show');

      await act(async () => {
        await result.current.restoreItemsFromTrash(items);
      });

      expect(mockMoveItemsThunk).toHaveBeenCalledTimes(1);
      expect(notificationsSpy).toHaveBeenCalledWith(expect.objectContaining({ type: ToastType.Success }));
    });

    test('When all items have their original folders available, then all are restored in the correct folder and a success notification is shown', async () => {
      const items = [
        buildItemWithExistingParent({
          parent: { uuid: 'parent-uuid-1', status: FileStatus.EXISTS, plainName: 'My First Folder' },
        }),
        buildItemWithExistingParent({
          parent: { uuid: 'parent-uuid-2', status: FileStatus.EXISTS, plainName: 'My Second Folder' },
        }),
      ];
      const { result } = renderHook(() => useMoveItems());
      const notificationsSpy = vi.spyOn(notificationsService, 'show');

      await act(async () => {
        await result.current.restoreItemsFromTrash(items);
      });

      expect(mockMoveItemsThunk).toHaveBeenCalledTimes(2);
      expect(notificationsSpy).toHaveBeenCalledWith(expect.objectContaining({ type: ToastType.Success }));
    });

    test('When some items have their folder deleted, then the dialog is opened only for those items', async () => {
      const restorable = buildItemWithExistingParent({ uuid: 'item-1' });
      const needsDestination = buildItemWithDeletedParent({ uuid: 'item-2' });
      const { result } = renderHook(() => useMoveItems());

      await act(async () => {
        await result.current.restoreItemsFromTrash([restorable, needsDestination]);
      });

      expect(mockSetItemsToMove).toHaveBeenCalledWith([needsDestination]);
      expect(mockSetIsMoveItemsDialogOpen).toHaveBeenCalledWith(true);
    });

    test('When all items need a new destination, then no success notification is shown before the user picks one', async () => {
      const items = [buildItemWithDeletedParent({ uuid: 'item-1' }), buildItemWithDeletedParent({ uuid: 'item-2' })];
      const { result } = renderHook(() => useMoveItems());
      const notificationsSpy = vi.spyOn(notificationsService, 'show');

      await act(async () => {
        await result.current.restoreItemsFromTrash(items);
      });

      expect(notificationsSpy).not.toHaveBeenCalled();
    });

    test('When any restore fails, then an error notification is shown', async () => {
      const items = [buildItemWithExistingParent({ uuid: 'item-1' }), buildItemWithExistingParent({ uuid: 'item-2' })];
      mockDispatch.mockImplementation(() => {
        throw new Error('Network error');
      });
      const { result } = renderHook(() => useMoveItems());
      const notificationsSpy = vi.spyOn(notificationsService, 'show');
      vi.spyOn(errorService, 'castError').mockReturnValue({ message: 'Network error', requestId: undefined } as any);

      await act(async () => {
        await result.current.restoreItemsFromTrash(items);
      });

      expect(notificationsSpy).toHaveBeenCalledWith(expect.objectContaining({ type: ToastType.Error }));
    });
  });

  describe('Move from dialog', () => {
    test('When the user confirms a destination in the dialog, then the item is moved there', async () => {
      const item = buildDriveItemData();
      const { result } = renderHook(() => useMoveItems());

      await act(async () => {
        await result.current.moveItemsFromDialog({ finalDestinationId: 'chosen-folder-uuid', items: [item] });
      });

      expect(mockMoveItemsThunk).toHaveBeenCalledWith(
        expect.objectContaining({ destinationFolderId: 'chosen-folder-uuid' }),
      );
    });

    test('When the item has a new name, then the move is called with that new name', async () => {
      const item = buildDriveItemData({ newItemName: 'renamed-file' } as any);
      const { result } = renderHook(() => useMoveItems());

      await act(async () => {
        await result.current.moveItemsFromDialog({ finalDestinationId: 'chosen-folder-uuid', items: [item] });
      });

      expect(mockMoveItemsThunk).toHaveBeenCalledWith(
        expect.objectContaining({
          items: expect.arrayContaining([expect.objectContaining({ newItemName: 'renamed-file' })]),
        }),
      );
    });

    test('When the move from dialog fails, then an error notification is shown', async () => {
      const item = buildDriveItemData();
      mockDispatch.mockImplementation(() => {
        throw new Error('Move failed');
      });
      const { result } = renderHook(() => useMoveItems());
      const notificationsSpy = vi.spyOn(notificationsService, 'show');
      vi.spyOn(errorService, 'castError').mockReturnValue({ message: 'Move failed', requestId: undefined } as any);

      await act(async () => {
        await result.current.moveItemsFromDialog({ finalDestinationId: 'chosen-folder-uuid', items: [item] });
      });

      expect(notificationsSpy).toHaveBeenCalledWith(expect.objectContaining({ type: ToastType.Error }));
    });
  });
});
