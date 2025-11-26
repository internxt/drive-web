import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import moveItemsToTrash from './moveItemsToTrash.service';
import { SdkFactory } from 'app/core/factory/sdk';
import errorService from 'services/error.service';
import { deleteDatabaseItems } from 'app/drive/services/database.service';
import { DriveItemData } from 'app/drive/types';
import notificationsService from 'app/notifications/services/notifications.service';
import { store } from 'app/store';
import { storageActions } from 'app/store/slices/storage';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import { processBatchConcurrently } from './batchProcessor.service';

vi.mock('app/core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(),
  },
}));

vi.mock('services/error.service', () => ({
  default: {
    reportError: vi.fn(),
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
  },
}));

vi.mock('app/store/slices/storage', () => ({
  storageActions: {
    popItems: vi.fn(),
    pushItems: vi.fn(),
    clearSelectedItems: vi.fn(),
  },
}));

vi.mock('app/store/slices/storage/storage.thunks', () => ({
  default: {
    moveItemsThunk: vi.fn(),
  },
}));

vi.mock('./batchProcessor.service', () => ({
  processBatchConcurrently: vi.fn(),
}));

vi.mock('i18next', () => ({
  t: vi.fn((key: string) => key),
}));

describe('moveItemsToTrash', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createTrashClient: () => ({
        addItemsToTrash: mockAddItemsToTrash,
      }),
    });

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

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createTrashClient: () => ({
        addItemsToTrash: vi.fn(),
      }),
    });

    await moveItemsToTrash(mockItems);

    undoCallback?.();

    expect(store.dispatch).toHaveBeenCalledWith(
      storageActions.pushItems({ updateRecents: true, items: mockItems, folderIds: ['parent-456'] }),
    );
    expect(store.dispatch).toHaveBeenCalledWith(
      storageThunks.moveItemsThunk({
        items: mockItems,
        destinationFolderId: 'parent-456',
      }),
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

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createTrashClient: () => ({
        addItemsToTrash: vi.fn(),
      }),
    });

    await moveItemsToTrash(mockItems);

    undoCallback?.();

    expect(store.dispatch).toHaveBeenCalledWith(
      storageActions.pushItems({ updateRecents: true, items: mockItems, folderIds: ['folder-789'] }),
    );
  });

  it('should handle errors', async () => {
    const mockItems = [{ uuid: 'file-1', isFolder: false, type: 'file' }] as DriveItemData[];
    const mockError = new Error('Move failed');

    (notificationsService.show as Mock).mockReturnValue('toast-id');
    (processBatchConcurrently as Mock).mockRejectedValue(mockError);

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createTrashClient: () => ({
        addItemsToTrash: vi.fn(),
      }),
    });

    await moveItemsToTrash(mockItems);

    expect(notificationsService.dismiss).toHaveBeenCalledWith('toast-id');
    expect(notificationsService.show).toHaveBeenCalledWith({
      text: 'error.errorMovingToTrash',
      type: 'error',
    });
    expect(errorService.reportError).toHaveBeenCalledWith(mockError);
  });
});
