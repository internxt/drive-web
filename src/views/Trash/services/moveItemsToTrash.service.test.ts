import { describe, it, test, expect, vi, beforeEach, Mock } from 'vitest';
import moveItemsToTrash from './moveItemsToTrash.service';
import errorService from 'services/error.service';
import { deleteDatabaseItems } from 'app/drive/services/database.service';
import { DriveItemData } from 'app/drive/types';
import notificationsService from 'app/notifications/services/notifications.service';
import { store } from 'app/store';
import { storageActions } from 'app/store/slices/storage';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import storageService from 'app/drive/services/storage.service';
import { processBatchConcurrently } from './batchProcessor.service';
import { mockSdkFactory } from 'testUtils/sdk.mock';

vi.mock('app/core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(),
  },
}));

vi.mock('services/error.service', () => ({
  default: {
    reportError: vi.fn(),
    castError: vi.fn((err) => ({ message: err?.message || 'Unknown error', requestId: 'test-request-id' })),
  },
}));

vi.mock('app/drive/services/database.service', () => ({
  deleteDatabaseItems: vi.fn(),
}));

vi.mock('app/notifications/services/notifications.service', () => ({
  default: {
    show: vi.fn(),
    dismiss: vi.fn(),
  },
  ToastType: {
    Error: 'error',
    Success: 'success',
    Loading: 'loading',
  },
}));

vi.mock('app/store', () => ({
  store: {
    dispatch: vi.fn(),
    getState: vi.fn(),
  },
}));

vi.mock('app/store/slices/storage', () => ({
  storageActions: {
    popItems: vi.fn(),
    pushItems: vi.fn(),
    clearSelectedItems: vi.fn(),
    resetFavoritesPagination: vi.fn(),
  },
}));

vi.mock('app/store/slices/storage/storage.thunks', () => ({
  default: {
    fetchFavoritesThunk: vi.fn(),
  },
}));

vi.mock('app/drive/services/storage.service', () => ({
  default: { moveItem: vi.fn() },
}));

vi.mock('./batchProcessor.service', () => ({
  processBatchConcurrently: vi.fn(),
}));

vi.mock('i18next', () => ({
  t: vi.fn((key: string) => key),
}));

describe('moveItemsToTrash', () => {
  beforeEach(() => {
    (store.getState as Mock).mockReturnValue({ storage: { favorites: [] } });
  });

  it('should move multiple items to trash with onSuccess callback', async () => {
    const mockItems = [
      { uuid: 'file-1', isFolder: false, type: 'file' },
      { uuid: 'folder-1', isFolder: true, type: 'folder' },
    ] as DriveItemData[];
    const onSuccess = vi.fn();
    const mockAddItemsToTrash = vi.fn().mockResolvedValue(undefined);

    (notificationsService.show as Mock).mockReturnValue('toast-id-123');
    (processBatchConcurrently as Mock).mockImplementation(async ({ processor }) => {
      await processor([{ uuid: 'test', type: 'file', id: null }]);
    });
    (deleteDatabaseItems as Mock).mockResolvedValue(undefined);

    mockSdkFactory({ createTrashClient: { addItemsToTrash: mockAddItemsToTrash } });

    await moveItemsToTrash(mockItems, onSuccess);

    expect(mockAddItemsToTrash).toHaveBeenCalledWith({
      items: [{ uuid: 'test', type: 'file', id: null }],
    });
    expect(onSuccess).toHaveBeenCalled();
    expect(notificationsService.dismiss).toHaveBeenCalledWith('toast-id-123');
  });

  it('should move single folder and handle undo', async () => {
    const mockItems = [
      { uuid: 'folder-1', isFolder: true, type: 'folder', parentUuid: 'parent-456' },
    ] as DriveItemData[];
    let undoCallback: (() => void) | undefined;

    (notificationsService.show as Mock).mockImplementation((config) => {
      if (config.action) {
        undoCallback = config.action.onClick;
      }
      return 'notification-id';
    });
    (processBatchConcurrently as Mock).mockResolvedValue(undefined);
    (deleteDatabaseItems as Mock).mockResolvedValue(undefined);

    mockSdkFactory({ createTrashClient: { addItemsToTrash: vi.fn() } });

    await moveItemsToTrash(mockItems);

    undoCallback?.();

    expect(store.dispatch).toHaveBeenCalledWith(
      storageActions.pushItems({ updateRecents: true, items: mockItems, folderIds: ['parent-456'] }),
    );
  });

  it('should move single file and handle undo', async () => {
    const mockItems = [{ uuid: 'file-1', isFolder: false, type: 'file', folderUuid: 'folder-789' }] as DriveItemData[];
    let undoCallback: (() => void) | undefined;

    (notificationsService.show as Mock).mockImplementation((config) => {
      if (config.action) {
        undoCallback = config.action.onClick;
      }
      return 'notification-id';
    });
    (processBatchConcurrently as Mock).mockResolvedValue(undefined);
    (deleteDatabaseItems as Mock).mockResolvedValue(undefined);

    mockSdkFactory({ createTrashClient: { addItemsToTrash: vi.fn() } });

    await moveItemsToTrash(mockItems);

    undoCallback?.();

    expect(store.dispatch).toHaveBeenCalledWith(
      storageActions.pushItems({ updateRecents: true, items: mockItems, folderIds: ['folder-789'] }),
    );
  });

  test('When a folder is trashed and there are favorites loaded, then the favorites list is refetched', async () => {
    const mockItems = [{ uuid: 'folder-1', isFolder: true, type: 'folder' }] as DriveItemData[];

    (store.getState as Mock).mockReturnValue({ storage: { favorites: [{ uuid: 'fav-1' }] } });
    (notificationsService.show as Mock).mockReturnValue('toast-id');
    (processBatchConcurrently as Mock).mockResolvedValue(undefined);
    (deleteDatabaseItems as Mock).mockResolvedValue(undefined);

    mockSdkFactory({ createTrashClient: { addItemsToTrash: vi.fn() } });

    await moveItemsToTrash(mockItems);

    expect(storageActions.resetFavoritesPagination).toHaveBeenCalled();
    expect(storageThunks.fetchFavoritesThunk).toHaveBeenCalled();
  });

  test('When only files are trashed, then the favorites list is not refetched', async () => {
    const mockItems = [{ uuid: 'file-1', isFolder: false, type: 'file' }] as DriveItemData[];

    (store.getState as Mock).mockReturnValue({ storage: { favorites: [{ uuid: 'fav-1' }] } });
    (notificationsService.show as Mock).mockReturnValue('toast-id');
    (processBatchConcurrently as Mock).mockResolvedValue(undefined);
    (deleteDatabaseItems as Mock).mockResolvedValue(undefined);

    mockSdkFactory({ createTrashClient: { addItemsToTrash: vi.fn() } });

    await moveItemsToTrash(mockItems);

    expect(storageActions.resetFavoritesPagination).not.toHaveBeenCalled();
    expect(storageThunks.fetchFavoritesThunk).not.toHaveBeenCalled();
  });

  test('When a folder is trashed but no favorites are loaded, then the favorites list is not refetched', async () => {
    const mockItems = [{ uuid: 'folder-1', isFolder: true, type: 'folder' }] as DriveItemData[];

    (notificationsService.show as Mock).mockReturnValue('toast-id');
    (processBatchConcurrently as Mock).mockResolvedValue(undefined);
    (deleteDatabaseItems as Mock).mockResolvedValue(undefined);

    mockSdkFactory({ createTrashClient: { addItemsToTrash: vi.fn() } });

    await moveItemsToTrash(mockItems);

    expect(storageActions.resetFavoritesPagination).not.toHaveBeenCalled();
    expect(storageThunks.fetchFavoritesThunk).not.toHaveBeenCalled();
  });

  describe('Undo', () => {
    const trashAndUndo = async (
      items: DriveItemData[],
      { onUndo, failingItems = [] }: { onUndo?: (isEverythingRestored: boolean) => void; failingItems?: string[] } = {},
    ) => {
      let undo: (() => void) | undefined;
      (notificationsService.show as Mock).mockImplementation((config) => {
        if (config.action) undo = config.action.onClick;
        return 'notification-id';
      });
      (processBatchConcurrently as Mock).mockImplementation(({ items: batch, processor }) => processor(batch));
      (deleteDatabaseItems as Mock).mockResolvedValue(undefined);
      mockSdkFactory({ createTrashClient: { addItemsToTrash: vi.fn() } });
      (storageService.moveItem as Mock).mockImplementation(async ({ uuid }: DriveItemData) => {
        if (failingItems.includes(uuid)) throw new Error('Network error');
      });

      await moveItemsToTrash(items, undefined, onUndo);
      undo?.();
    };

    const movedBack = () =>
      vi
        .mocked(storageService.moveItem)
        .mock.calls.map(([{ uuid }, destinationFolderId]) => `${uuid} -> ${destinationFolderId}`);

    test('When items of different folders are trashed and the user undoes it, then each item goes back to its own folder', async () => {
      const items = [
        { uuid: 'photo-of-monday', isFolder: false, type: 'jpg', folderUuid: 'monday-folder' },
        { uuid: 'photo-of-tuesday', isFolder: false, type: 'jpg', folderUuid: 'tuesday-folder' },
        { uuid: 'subfolder', isFolder: true, type: 'folder', parentUuid: 'tuesday-folder' },
      ] as unknown as DriveItemData[];

      await trashAndUndo(items);

      await vi.waitFor(() =>
        expect(movedBack()).toStrictEqual([
          'photo-of-monday -> monday-folder',
          'photo-of-tuesday -> tuesday-folder',
          'subfolder -> tuesday-folder',
        ]),
      );
    });

    test('When the user undoes it, then the caller is told once the items are back so it can show them again', async () => {
      const onUndo = vi.fn();

      await trashAndUndo(
        [{ uuid: 'report', isFolder: false, type: 'pdf', folderUuid: 'documents' }] as DriveItemData[],
        {
          onUndo,
        },
      );

      await vi.waitFor(() => expect(onUndo).toHaveBeenCalledExactlyOnceWith(true));
    });

    test('When some items cannot be moved back, then only those leave their folder again, one error is shown and the caller is told', async () => {
      const onUndo = vi.fn();
      const report = { id: 1, uuid: 'report', isFolder: false, type: 'pdf', folderUuid: 'documents' };
      const invoice = { id: 2, uuid: 'invoice', isFolder: false, type: 'pdf', folderUuid: 'documents' };
      const contract = { id: 3, uuid: 'contract', isFolder: false, type: 'pdf', folderUuid: 'documents' };

      await trashAndUndo([report, invoice, contract] as unknown as DriveItemData[], {
        onUndo,
        failingItems: ['report', 'contract'],
      });

      await vi.waitFor(() => expect(onUndo).toHaveBeenCalledExactlyOnceWith(false));
      expect(storageActions.popItems).toHaveBeenLastCalledWith({
        updateRecents: true,
        items: [report, contract],
        folderIds: ['documents'],
      });
      expect(notificationsService.show).toHaveBeenCalledWith({ text: 'error.movingItem', type: 'error' });
      expect((notificationsService.show as Mock).mock.calls.filter(([{ type }]) => type === 'error')).toHaveLength(1);
    });
  });

  it('should handle errors', async () => {
    const mockItems = [{ uuid: 'file-1', isFolder: false, type: 'file' }] as DriveItemData[];
    const mockError = new Error('Move failed');

    (notificationsService.show as Mock).mockReturnValue('toast-id');
    (processBatchConcurrently as Mock).mockRejectedValue(mockError);

    mockSdkFactory({ createTrashClient: { addItemsToTrash: vi.fn() } });

    await moveItemsToTrash(mockItems);

    expect(notificationsService.dismiss).toHaveBeenCalledWith('toast-id');
    expect(notificationsService.show).toHaveBeenCalledWith({
      text: 'error.errorMovingToTrash',
      type: 'error',
      requestId: 'test-request-id',
    });
    expect(errorService.reportError).toHaveBeenCalledWith(mockError);
  });
});
