import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import clearTrash from './clear-trash';
import { SdkFactory } from 'app/core/factory/sdk';
import errorService from 'app/core/services/error.service';
import workspacesService from 'app/core/services/workspace.service';
import notificationsService from 'app/notifications/services/notifications.service';
import { store } from 'app/store';
import { storageActions } from 'app/store/slices/storage';

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

vi.mock('app/core/services/workspace.service', () => ({
  default: {
    emptyTrash: vi.fn(),
  },
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
    resetTrash: vi.fn(),
    clearSelectedItems: vi.fn(),
  },
}));

vi.mock('i18next', () => ({
  t: vi.fn((key: string) => key),
}));

describe('clearTrash', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should clear trash for personal account', async () => {
    const mockClearTrash = vi.fn().mockResolvedValue(undefined);
    (notificationsService.show as Mock).mockReturnValue('toast-id-123');

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createTrashClient: () => ({
        clearTrash: mockClearTrash,
      }),
    });

    await clearTrash();

    expect(notificationsService.show).toHaveBeenCalledWith({
      type: 'loading',
      text: 'drive.deletingItems',
      duration: 100000,
      closable: false,
    });
    expect(mockClearTrash).toHaveBeenCalled();
    expect(store.dispatch).toHaveBeenCalledWith(storageActions.resetTrash());
    expect(store.dispatch).toHaveBeenCalledWith(storageActions.clearSelectedItems());
    expect(notificationsService.dismiss).toHaveBeenCalledWith('toast-id-123');
    expect(notificationsService.show).toHaveBeenCalledWith({
      type: 'success',
      text: 'trash.clearTrash',
    });
  });

  it('should clear trash for workspace account', async () => {
    const workspaceId = 'workspace-123';
    (notificationsService.show as Mock).mockReturnValue('toast-id-456');
    (workspacesService.emptyTrash as Mock).mockResolvedValue(undefined);

    await clearTrash(workspaceId);

    expect(workspacesService.emptyTrash).toHaveBeenCalledWith(workspaceId);
    expect(store.dispatch).toHaveBeenCalledWith(storageActions.resetTrash());
    expect(notificationsService.dismiss).toHaveBeenCalledWith('toast-id-456');
  });

  it('should handle errors', async () => {
    const mockError = new Error('Failed to clear trash');
    const mockClearTrash = vi.fn().mockRejectedValue(mockError);
    (notificationsService.show as Mock).mockReturnValue('toast-id-789');

    (SdkFactory.getNewApiInstance as Mock).mockReturnValue({
      createTrashClient: () => ({
        clearTrash: mockClearTrash,
      }),
    });

    await clearTrash();

    expect(notificationsService.dismiss).toHaveBeenCalledWith('toast-id-789');
    expect(notificationsService.show).toHaveBeenCalledWith({
      text: 'error.errorDeletingFromTrash',
      type: 'error',
    });
    expect(errorService.reportError).toHaveBeenCalledWith(mockError);
  });
});
