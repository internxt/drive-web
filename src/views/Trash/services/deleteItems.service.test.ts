import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import deleteItems from './deleteItems.service';
import { SdkFactory } from 'app/core/factory/sdk';
import errorService from 'app/core/services/error.service';
import { deleteDatabaseItems } from 'app/drive/services/database.service';
import { DriveItemData } from 'app/drive/types';
import notificationsService from 'app/notifications/services/notifications.service';
import { store } from 'app/store';
import { storageActions } from 'app/store/slices/storage';
import { processBatchConcurrently } from './batchProcessor.service';

vi.mock('app/core/factory/sdk', () => ({
  SdkFactory: {
    getNewApiInstance: vi.fn(),
  },
}));

vi.mock('app/core/services/error.service', () => ({
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
  },
  ToastType: {
    Error: 'error',
    Success: 'success',
  },
}));

vi.mock('app/store', () => ({
  store: {
    dispatch: vi.fn(),
  },
}));

vi.mock('app/store/slices/storage', () => ({
  storageActions: {
    popItemsToDelete: vi.fn(),
    addFoldersOnTrashLength: vi.fn(),
    addFilesOnTrashLength: vi.fn(),
    clearSelectedItems: vi.fn(),
  },
}));

vi.mock('./batchProcessor.service', () => ({
  processBatchConcurrently: vi.fn(),
}));

vi.mock('i18next', () => ({
  t: vi.fn((key: string) => key),
}));

describe('DeleteItems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete multiple items permanently', async () => {
    const mockItems = [
      { uuid: 'file-1', isFolder: false },
      { uuid: 'folder-1', isFolder: true },
      { uuid: 'file-2', isFolder: false },
    ] as DriveItemData[];

    const mockDeletePermanently = vi.fn().mockResolvedValue(undefined);

    (processBatchConcurrently as Mock).mockImplementation(async ({ processor }) => {
      await processor([{ uuid: 'test', type: 'file' }]);
    });
    (deleteDatabaseItems as Mock).mockResolvedValue(undefined);

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createTrashClient: () => ({
        deleteItemsPermanentlyByUUID: mockDeletePermanently,
      }),
    });

    await deleteItems(mockItems);

    expect(processBatchConcurrently).toHaveBeenCalled();
    expect(mockDeletePermanently).toHaveBeenCalledWith({
      items: [{ uuid: 'test', type: 'file' }],
    });
    expect(deleteDatabaseItems).toHaveBeenCalledWith(mockItems);
    expect(store.dispatch).toHaveBeenCalledWith(storageActions.popItemsToDelete(mockItems));
    expect(store.dispatch).toHaveBeenCalledWith(storageActions.addFoldersOnTrashLength(-1));
    expect(store.dispatch).toHaveBeenCalledWith(storageActions.addFilesOnTrashLength(-2));
    expect(store.dispatch).toHaveBeenCalledWith(storageActions.clearSelectedItems());
    expect(notificationsService.show).toHaveBeenCalledWith({
      type: 'success',
      text: 'notificationMessages.itemsDeleted',
    });
  });

  it('should delete single folder', async () => {
    const mockItems = [{ uuid: 'folder-1', isFolder: true }] as DriveItemData[];

    (processBatchConcurrently as Mock).mockResolvedValue(undefined);
    (deleteDatabaseItems as Mock).mockResolvedValue(undefined);

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createTrashClient: () => ({
        deleteItemsPermanentlyByUUID: vi.fn(),
      }),
    });

    await deleteItems(mockItems);

    expect(store.dispatch).toHaveBeenCalledWith(storageActions.addFoldersOnTrashLength(-1));
    expect(store.dispatch).toHaveBeenCalledWith(storageActions.addFilesOnTrashLength(0));
    expect(notificationsService.show).toHaveBeenCalledWith({
      type: 'success',
      text: 'notificationMessages.itemDeleted',
    });
  });

  it('should delete single file', async () => {
    const mockItems = [{ uuid: 'file-1', isFolder: false }] as DriveItemData[];

    (processBatchConcurrently as Mock).mockResolvedValue(undefined);
    (deleteDatabaseItems as Mock).mockResolvedValue(undefined);

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createTrashClient: () => ({
        deleteItemsPermanentlyByUUID: vi.fn(),
      }),
    });

    await deleteItems(mockItems);

    expect(store.dispatch).toHaveBeenCalledWith(storageActions.addFoldersOnTrashLength(0));
    expect(store.dispatch).toHaveBeenCalledWith(storageActions.addFilesOnTrashLength(-1));
  });

  it('should handle errors', async () => {
    const mockItems = [{ uuid: 'file-1', isFolder: false }] as DriveItemData[];
    const mockError = new Error('Delete failed');

    (processBatchConcurrently as Mock).mockRejectedValue(mockError);

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createTrashClient: () => ({
        deleteItemsPermanentlyByUUID: vi.fn(),
      }),
    });

    await deleteItems(mockItems);

    expect(notificationsService.show).toHaveBeenCalledWith({
      text: 'error.errorDeletingFromTrash',
      type: 'error',
    });
    expect(errorService.reportError).toHaveBeenCalledWith(mockError);
  });
});
