import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { getTrash, getTrashPaginated, getWorkspaceTrashPaginated } from './getTrash.service';
import { SdkFactory } from 'app/core/factory/sdk';
import errorService from 'services/error.service';
import localStorageService from 'services/local-storage.service';
import workspacesService from 'services/workspace.service';
import { store } from 'app/store';
import { storageActions } from 'app/store/slices/storage';

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

vi.mock('services/local-storage.service', () => ({
  default: {
    getB2BWorkspace: vi.fn(),
  },
}));

vi.mock('services/workspace.service', () => ({
  default: {
    getTrashItems: vi.fn(),
  },
}));

vi.mock('app/notifications/services/notifications.service', () => ({
  default: {
    show: vi.fn(),
  },
  ToastType: {
    Error: 'error',
    Success: 'success',
    Warning: 'warning',
    Info: 'info',
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
    clearSelectedItems: vi.fn(),
    setItemsOnTrash: vi.fn(),
    addItemsOnTrash: vi.fn(),
    addFoldersOnTrashLength: vi.fn(),
    addFilesOnTrashLength: vi.fn(),
  },
}));

vi.mock('i18next', () => ({
  t: vi.fn((key: string) => key),
}));

describe('get_trash', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTrash', () => {
    it('should fetch trash items and dispatch them to store', async () => {
      const mockFiles = [{ id: 1, name: 'file1' }];
      const mockFolders = [{ id: 2, name: 'folder1' }];
      const mockGetTrash = vi.fn().mockResolvedValue({
        files: mockFiles,
        children: mockFolders,
      });

      (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
        createTrashClient: () => ({
          getTrash: mockGetTrash,
        }),
      });

      await getTrash();

      expect(mockGetTrash).toHaveBeenCalled();
      expect(mockFolders[0]).toHaveProperty('isFolder', true);
      expect(store.dispatch).toHaveBeenCalledWith(storageActions.clearSelectedItems());
      expect(store.dispatch).toHaveBeenCalledWith(
        storageActions.setItemsOnTrash(expect.arrayContaining([...mockFiles, ...mockFolders])),
      );
    });
  });

  describe('getTrashPaginated', () => {
    it('should fetch paginated trash folders', async () => {
      const mockResult = [{ plainName: 'folder1', id: 1 }];
      const mockGetTrashedItemsSorted = vi.fn().mockResolvedValue({ result: mockResult });

      (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
        createTrashClient: () => ({ getTrashedItemsSorted: mockGetTrashedItemsSorted }),
      });

      const result = await getTrashPaginated(50, 0, 'folders', true, 'plainName', 'ASC');

      expect(store.dispatch).toHaveBeenCalledWith(storageActions.addFoldersOnTrashLength(1));
      expect(result).toEqual({ finished: true, itemsRetrieved: 1 });
    });

    it('should fetch paginated trash files', async () => {
      const mockResult = new Array(50).fill(null).map((_, i) => ({ plainName: `item${i}`, id: i }));
      const mockGetTrashedItemsSorted = vi.fn().mockResolvedValue({ result: mockResult });

      (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
        createTrashClient: () => ({ getTrashedItemsSorted: mockGetTrashedItemsSorted }),
      });

      const result = await getTrashPaginated(50, 0, 'files', true, 'plainName', 'ASC');

      expect(store.dispatch).toHaveBeenCalledWith(storageActions.addFilesOnTrashLength(50));
      expect(result).toEqual({ finished: false, itemsRetrieved: 50 });
    });

    it('should handle errors', async () => {
      const mockGetTrashedItemsSorted = vi.fn().mockRejectedValue(new Error('Failed'));

      (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
        createTrashClient: () => ({ getTrashedItemsSorted: mockGetTrashedItemsSorted }),
      });

      const result = await getTrashPaginated(50, 0, 'files', true, 'plainName', 'ASC');

      expect(errorService.reportError).toHaveBeenCalled();
      expect(result).toEqual({ finished: false, itemsRetrieved: 0 });
    });
  });

  describe('getWorkspaceTrashPaginated', () => {
    it('should fetch workspace trash folders', async () => {
      const mockWorkspace = { workspace: { id: 'workspace-123' } };
      const mockResult = [{ plainName: 'folder1', id: 1 }];

      (localStorageService.getB2BWorkspace as Mock).mockReturnValue(mockWorkspace);
      (workspacesService.getTrashItems as Mock).mockResolvedValue({ result: mockResult });

      const result = await getWorkspaceTrashPaginated(50, 0, 'folders');

      expect(workspacesService.getTrashItems).toHaveBeenCalledWith('workspace-123', 'folder', 0);
      expect(store.dispatch).toHaveBeenCalledWith(storageActions.addFoldersOnTrashLength(1));
      expect(result).toEqual({ finished: true, itemsRetrieved: 1 });
    });

    it('should fetch workspace trash files', async () => {
      const mockWorkspace = { workspace: { id: 'workspace-456' } };
      const mockResult = [{ plainName: 'file1.txt', id: 1 }];

      (localStorageService.getB2BWorkspace as Mock).mockReturnValue(mockWorkspace);
      (workspacesService.getTrashItems as Mock).mockResolvedValue({ result: mockResult });

      const result = await getWorkspaceTrashPaginated(50, 10, 'files');

      expect(workspacesService.getTrashItems).toHaveBeenCalledWith('workspace-456', 'file', 10);
      expect(result).toEqual({ finished: true, itemsRetrieved: 1 });
    });

    it('should handle errors', async () => {
      const mockWorkspace = { workspace: { id: 'workspace-789' } };

      (localStorageService.getB2BWorkspace as Mock).mockReturnValue(mockWorkspace);
      (workspacesService.getTrashItems as Mock).mockRejectedValue(new Error('Failed'));

      const result = await getWorkspaceTrashPaginated(50, 0, 'files');

      expect(errorService.reportError).toHaveBeenCalled();
      expect(result).toEqual({ finished: false, itemsRetrieved: 0 });
    });
  });
});
