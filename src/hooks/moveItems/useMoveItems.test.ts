import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileStatus } from '@internxt/sdk/dist/drive/storage/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { errorService } from 'services';
import { DriveItemData } from 'app/drive/types';
import { useMoveItems } from './useMoveItems';
import { buildDriveItemData } from '../../../test/unit/fixtures/drive.fixtures';

const { mockDispatch, mockMoveItemsThunk, mockPopItemsToDelete, mockSetItemsToMove, mockSetIsMoveItemsDialogOpen } =
  vi.hoisted(() => ({
    mockDispatch: vi.fn(),
    mockMoveItemsThunk: vi.fn((payload: unknown) => ({ type: 'moveItemsThunk', payload })),
    mockPopItemsToDelete: vi.fn((items: unknown) => ({ type: 'popItemsToDelete', payload: items })),
    mockSetItemsToMove: vi.fn((items: unknown) => ({ type: 'setItemsToMove', payload: items })),
    mockSetIsMoveItemsDialogOpen: vi.fn((val: unknown) => ({ type: 'setIsMoveItemsDialogOpen', payload: val })),
  }));

vi.mock('app/store/hooks', () => ({ useAppDispatch: () => mockDispatch }));
vi.mock('react-redux', () => ({
  useSelector: vi.fn((selector: (s: unknown) => unknown) => selector({ storage: { itemsToMove: [] } })),
}));
vi.mock('i18next', () => ({ default: { t: (key: string) => key }, t: (key: string) => key }));
vi.mock('app/store/slices/storage/storage.thunks', () => ({ default: { moveItemsThunk: mockMoveItemsThunk } }));
vi.mock('app/store/slices/storage/storage.thunks/renameItemsThunk', () => ({
  handleRepeatedUploadingFiles: vi.fn(async (files: unknown[]) => files),
  handleRepeatedUploadingFolders: vi.fn(async (folders: unknown[]) => folders),
}));
vi.mock('app/store/slices/storage', () => ({
  storageActions: { popItemsToDelete: mockPopItemsToDelete, setItemsToMove: mockSetItemsToMove },
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
      // Arrange
      const item = buildItemWithExistingParent();
      const { result } = renderHook(() => useMoveItems());

      // Act
      await act(async () => {
        await result.current.restoreItemFromTrash(item);
      });

      // Assert
      expect(mockMoveItemsThunk).toHaveBeenCalledWith(expect.objectContaining({ destinationFolderId: 'parent-uuid' }));
    });

    test('When the original folder still exists, then the item is removed from the trash list', async () => {
      // Arrange
      const item = buildItemWithExistingParent();
      const { result } = renderHook(() => useMoveItems());

      // Act
      await act(async () => {
        await result.current.restoreItemFromTrash(item);
      });

      // Assert
      expect(mockPopItemsToDelete).toHaveBeenCalledWith([item]);
    });

    test('When the original folder still exists, then a success notification is shown', async () => {
      // Arrange
      const item = buildItemWithExistingParent();
      const { result } = renderHook(() => useMoveItems());
      const notificationsSpy = vi.spyOn(notificationsService, 'show');

      // Act
      await act(async () => {
        await result.current.restoreItemFromTrash(item);
      });

      // Assert
      expect(notificationsSpy).toHaveBeenCalledWith(expect.objectContaining({ type: ToastType.Success }));
    });

    test('When the original folder no longer exists, then the move dialog is opened so the user can pick a destination', async () => {
      // Arrange
      const item = buildItemWithDeletedParent();
      const { result } = renderHook(() => useMoveItems());

      // Act
      await act(async () => {
        await result.current.restoreItemFromTrash(item);
      });

      // Assert
      expect(mockSetItemsToMove).toHaveBeenCalledWith([item]);
      expect(mockSetIsMoveItemsDialogOpen).toHaveBeenCalledWith(true);
    });

    test('When the original folder no longer exists, then no success notification is shown', async () => {
      // Arrange
      const item = buildItemWithDeletedParent();
      const { result } = renderHook(() => useMoveItems());
      const notificationsSpy = vi.spyOn(notificationsService, 'show');

      // Act
      await act(async () => {
        await result.current.restoreItemFromTrash(item);
      });

      // Assert
      expect(notificationsSpy).not.toHaveBeenCalled();
    });

    test('When the restore fails, then an error notification is shown', async () => {
      // Arrange
      const item = buildItemWithExistingParent();
      mockDispatch.mockImplementation(() => {
        throw new Error('Network error');
      });
      const { result } = renderHook(() => useMoveItems());
      const notificationsSpy = vi.spyOn(notificationsService, 'show');
      vi.spyOn(errorService, 'castError').mockReturnValue({ message: 'Network error', requestId: undefined } as any);

      // Act
      await act(async () => {
        await result.current.restoreItemFromTrash(item);
      });

      // Assert
      expect(notificationsSpy).toHaveBeenCalledWith(expect.objectContaining({ type: ToastType.Error }));
    });
  });

  describe('Multiple items restore', () => {
    test('When all items have their original folder available, then all are restored and a success notification is shown', async () => {
      // Arrange
      const items = [buildItemWithExistingParent({ uuid: 'item-1' }), buildItemWithExistingParent({ uuid: 'item-2' })];
      const { result } = renderHook(() => useMoveItems());
      const notificationsSpy = vi.spyOn(notificationsService, 'show');

      // Act
      await act(async () => {
        await result.current.restoreItemsFromTrash(items);
      });

      // Assert
      expect(mockMoveItemsThunk).toHaveBeenCalledTimes(2);
      expect(notificationsSpy).toHaveBeenCalledWith(expect.objectContaining({ type: ToastType.Success }));
    });

    test('When some items have their folder deleted, then the dialog is opened only for those items', async () => {
      // Arrange
      const restorable = buildItemWithExistingParent({ uuid: 'item-1' });
      const needsDestination = buildItemWithDeletedParent({ uuid: 'item-2' });
      const { result } = renderHook(() => useMoveItems());

      // Act
      await act(async () => {
        await result.current.restoreItemsFromTrash([restorable, needsDestination]);
      });

      // Assert
      expect(mockSetItemsToMove).toHaveBeenCalledWith([needsDestination]);
      expect(mockSetIsMoveItemsDialogOpen).toHaveBeenCalledWith(true);
    });

    test('When all items need a new destination, then no success notification is shown before the user picks one', async () => {
      // Arrange
      const items = [buildItemWithDeletedParent({ uuid: 'item-1' }), buildItemWithDeletedParent({ uuid: 'item-2' })];
      const { result } = renderHook(() => useMoveItems());
      const notificationsSpy = vi.spyOn(notificationsService, 'show');

      // Act
      await act(async () => {
        await result.current.restoreItemsFromTrash(items);
      });

      // Assert
      expect(notificationsSpy).not.toHaveBeenCalled();
    });

    test('When any restore fails, then an error notification is shown', async () => {
      // Arrange
      const items = [buildItemWithExistingParent({ uuid: 'item-1' }), buildItemWithExistingParent({ uuid: 'item-2' })];
      mockDispatch.mockImplementation(() => {
        throw new Error('Network error');
      });
      const { result } = renderHook(() => useMoveItems());
      const notificationsSpy = vi.spyOn(notificationsService, 'show');
      vi.spyOn(errorService, 'castError').mockReturnValue({ message: 'Network error', requestId: undefined } as any);

      // Act
      await act(async () => {
        await result.current.restoreItemsFromTrash(items);
      });

      // Assert
      expect(notificationsSpy).toHaveBeenCalledWith(expect.objectContaining({ type: ToastType.Error }));
    });
  });

  describe('Move from dialog', () => {
    test('When the user confirms a destination in the dialog, then the item is moved there', async () => {
      // Arrange
      const item = buildDriveItemData();
      const { result } = renderHook(() => useMoveItems());

      // Act
      await act(async () => {
        await result.current.moveItemFromDialog({ finalDestinationId: 'chosen-folder-uuid', items: [item] });
      });

      // Assert
      expect(mockMoveItemsThunk).toHaveBeenCalledWith(
        expect.objectContaining({ destinationFolderId: 'chosen-folder-uuid' }),
      );
    });

    test('When the move from dialog fails, then an error notification is shown', async () => {
      // Arrange
      const item = buildDriveItemData();
      mockDispatch.mockImplementation(() => {
        throw new Error('Move failed');
      });
      const { result } = renderHook(() => useMoveItems());
      const notificationsSpy = vi.spyOn(notificationsService, 'show');
      vi.spyOn(errorService, 'castError').mockReturnValue({ message: 'Move failed', requestId: undefined } as any);

      // Act
      await act(async () => {
        await result.current.moveItemFromDialog({ finalDestinationId: 'chosen-folder-uuid', items: [item] });
      });

      // Assert
      expect(notificationsSpy).toHaveBeenCalledWith(expect.objectContaining({ type: ToastType.Error }));
    });
  });
});
