import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import tasksService from 'app/tasks/services/tasks.service';
import storageService from 'app/drive/services/storage.service';
import { buildDriveItemData } from '../../../../../../test/unit/fixtures/drive.fixtures';

const { mockDispatch } = vi.hoisted(() => ({
  mockDispatch: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('app/database/services/database.service', () => ({
  default: { get: vi.fn().mockResolvedValue(null) },
  DatabaseCollection: { Levels: 'levels' },
  DatabaseProvider: {},
  LRUCacheTypes: {},
}));
vi.mock('app/drive/services/items-list.service', () => ({ default: { pushItems: vi.fn() } }));
vi.mock('app/notifications/services/notifications.service', () => ({
  default: { show: vi.fn() },
  ToastType: { Error: 'error' },
}));
vi.mock('app/store/slices/storage', () => ({
  storageActions: { popItems: vi.fn(), pushItems: vi.fn(), clearSelectedItems: vi.fn() },
  storageSelectors: {},
  default: {},
}));
vi.mock('i18next', () => ({ default: { t: (key: string) => key }, t: (key: string) => key }));
vi.mock('services/error.service', () => ({ default: { reportError: vi.fn() } }));

import { moveItemsThunk } from './moveItemsThunk';

const runThunk = (payload: Parameters<typeof moveItemsThunk>[0]) =>
  moveItemsThunk(payload)(mockDispatch, () => ({}) as any, undefined);

describe('Move items task logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDispatch.mockResolvedValue(undefined);
    vi.spyOn(storageService, 'moveItem').mockResolvedValue(undefined as any);
    vi.spyOn(tasksService, 'create').mockReturnValue('task-id');
    vi.spyOn(tasksService, 'updateTask').mockReturnValue(undefined as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('When a file is moved and the task logger is enabled, then a task is created for it', async () => {
    const file = buildDriveItemData({ isFolder: false });

    await runThunk({ items: [file], destinationFolderId: 'dest-uuid', displayTaskLogger: true });

    expect(tasksService.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'move-file' }));
  });

  test('When a folder is moved and the task logger is enabled, then a task is created for it', async () => {
    const folder = buildDriveItemData({ isFolder: true, type: 'folder' });

    await runThunk({ items: [folder], destinationFolderId: 'dest-uuid', displayTaskLogger: true });

    expect(tasksService.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'move-folder' }));
  });

  test('When an item is moved without the task logger, then no task is created', async () => {
    const file = buildDriveItemData({ isFolder: false });

    await runThunk({ items: [file], destinationFolderId: 'dest-uuid', displayTaskLogger: false });

    expect(tasksService.create).not.toHaveBeenCalled();
  });
});
