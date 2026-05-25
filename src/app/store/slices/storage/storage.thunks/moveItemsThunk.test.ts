import { describe, test, expect, vi, beforeEach } from 'vitest';
import { TaskStatus, TaskType } from 'app/tasks/types';

const mockMoveItem = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const { mockTasksCreate, mockTasksUpdate } = vi.hoisted(() => ({
  mockTasksCreate: vi.fn().mockReturnValue('mock-task-id'),
  mockTasksUpdate: vi.fn(),
}));

vi.mock('app/drive/services/storage.service', () => ({
  default: {
    moveItem: mockMoveItem,
  },
}));

vi.mock('app/database/services/database.service', () => ({
  default: {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn(),
  },
  DatabaseCollection: {
    Levels: 'levels',
  },
}));

vi.mock('app/drive/services/items-list.service', () => ({
  default: {
    pushItems: vi.fn().mockReturnValue([]),
  },
}));

vi.mock('i18next', () => ({
  t: vi.fn((key: string) => key),
}));

vi.mock('app/store/slices/storage', () => ({
  storageActions: {
    popItems: vi.fn((payload) => ({ type: 'storage/popItems', payload })),
    pushItems: vi.fn((payload) => ({ type: 'storage/pushItems', payload })),
    clearSelectedItems: vi.fn(() => ({ type: 'storage/clearSelectedItems' })),
  },
}));

vi.mock('app/tasks/services/tasks.service', () => ({
  default: {
    create: mockTasksCreate,
    updateTask: mockTasksUpdate,
  },
}));

import { moveItemsThunk, MoveItemPayload } from './moveItemsThunk';
import { getDriveItemData } from 'testUtils/fixtures/drive.fixtures';

function buildMockDispatch() {
  return vi.fn().mockResolvedValue(undefined);
}

function buildMockGetState() {
  return vi.fn();
}

async function dispatchThunk(
  payload: Parameters<typeof moveItemsThunk>[0],
  dispatch = buildMockDispatch(),
  getState = buildMockGetState(),
) {
  const thunk = moveItemsThunk(payload);
  return thunk(dispatch, getState, undefined);
}

describe('Moving items - Thunk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When moving a file item that has a new name set, then the storage service receives the new name', async () => {
    const destinationFolderId = 'dest-folder-uuid';
    const newItemName = 'renamed-document';
    const fileItem: MoveItemPayload = {
      ...getDriveItemData({ uuid: 'file-uuid-1', isFolder: false, folderUuid: 'source-folder-uuid' }),
      newItemName,
    };

    await dispatchThunk({ items: [fileItem], destinationFolderId });

    expect(mockMoveItem).toHaveBeenCalledWith(fileItem, destinationFolderId, newItemName);
  });

  test('When moving a file item without a new name, then the storage service receives undefined for the name', async () => {
    const destinationFolderId = 'dest-folder-uuid';
    const fileItem: MoveItemPayload = {
      ...getDriveItemData({ uuid: 'file-uuid-2', isFolder: false, folderUuid: 'source-folder-uuid' }),
    };

    await dispatchThunk({ items: [fileItem], destinationFolderId });

    expect(mockMoveItem).toHaveBeenCalledWith(fileItem, destinationFolderId, undefined);
  });

  test('When moving a folder item that has a new name set, then the storage service receives the new name', async () => {
    const destinationFolderId = 'dest-folder-uuid';
    const newItemName = 'renamed-folder';
    const folderItem: MoveItemPayload = {
      ...getDriveItemData({ uuid: 'folder-uuid-1', isFolder: true, folderUuid: 'source-folder-uuid' }),
      newItemName,
    };

    await dispatchThunk({ items: [folderItem], destinationFolderId });

    expect(mockMoveItem).toHaveBeenCalledWith(folderItem, destinationFolderId, newItemName);
  });

  test('When moving a folder item without a new name, then the storage service receives undefined for the name', async () => {
    const destinationFolderId = 'dest-folder-uuid';
    const folderItem: MoveItemPayload = {
      ...getDriveItemData({ uuid: 'folder-uuid-2', isFolder: true, folderUuid: 'source-folder-uuid' }),
    };

    await dispatchThunk({ items: [folderItem], destinationFolderId });

    expect(mockMoveItem).toHaveBeenCalledWith(folderItem, destinationFolderId, undefined);
  });

  test('When moving multiple items each with distinct new names, then each item is moved with its own new name', async () => {
    const destinationFolderId = 'dest-folder-uuid';
    const fileItem: MoveItemPayload = {
      ...getDriveItemData({ uuid: 'file-uuid-multi', isFolder: false, folderUuid: 'source-folder-uuid' }),
      newItemName: 'new-file-name',
    };
    const folderItem: MoveItemPayload = {
      ...getDriveItemData({ uuid: 'folder-uuid-multi', isFolder: true, folderUuid: 'source-folder-uuid' }),
      newItemName: 'new-folder-name',
    };

    await dispatchThunk({ items: [fileItem, folderItem], destinationFolderId });

    expect(mockMoveItem).toHaveBeenCalledWith(fileItem, destinationFolderId, 'new-file-name');
    expect(mockMoveItem).toHaveBeenCalledWith(folderItem, destinationFolderId, 'new-folder-name');
  });
});

describe('Moving items - Task logger', () => {
  const destinationFolderId = 'dest-folder-uuid';

  beforeEach(() => {
    vi.clearAllMocks();
    mockMoveItem.mockResolvedValue(undefined);
    mockTasksCreate.mockReturnValue('mock-task-id');
  });

  test('When moving a file with the task logger enabled, then a move-file task is created with the correct item and destination', async () => {
    const fileItem: MoveItemPayload = {
      ...getDriveItemData({ uuid: 'file-uuid-logger', isFolder: false, folderUuid: 'source-folder-uuid' }),
    };

    await dispatchThunk({ items: [fileItem], destinationFolderId, displayTaskLogger: true });

    expect(mockTasksCreate).toHaveBeenCalledOnce();
    expect(mockTasksCreate).toHaveBeenCalledWith({
      action: TaskType.MoveFile,
      showNotification: true,
      file: fileItem,
      destinationFolderId,
      cancellable: false,
    });
  });

  test('When moving a folder with the task logger enabled, then a move-folder task is created with the correct item and destination', async () => {
    const folderItem: MoveItemPayload = {
      ...getDriveItemData({ uuid: 'folder-uuid-logger', isFolder: true, folderUuid: 'source-folder-uuid' }),
    };

    await dispatchThunk({ items: [folderItem], destinationFolderId, displayTaskLogger: true });

    expect(mockTasksCreate).toHaveBeenCalledOnce();
    expect(mockTasksCreate).toHaveBeenCalledWith({
      action: TaskType.MoveFolder,
      showNotification: true,
      folder: folderItem,
      destinationFolderId,
      cancellable: false,
    });
  });

  test('When moving an item with the task logger disabled, then no task is created', async () => {
    const fileItem: MoveItemPayload = {
      ...getDriveItemData({ uuid: 'file-uuid-no-logger', isFolder: false, folderUuid: 'source-folder-uuid' }),
    };

    await dispatchThunk({ items: [fileItem], destinationFolderId, displayTaskLogger: false });

    expect(mockTasksCreate).not.toHaveBeenCalled();
  });

  test('When moving an item without specifying the task logger flag, then no task is created', async () => {
    const fileItem: MoveItemPayload = {
      ...getDriveItemData({ uuid: 'file-uuid-no-flag', isFolder: false, folderUuid: 'source-folder-uuid' }),
    };

    await dispatchThunk({ items: [fileItem], destinationFolderId });

    expect(mockTasksCreate).not.toHaveBeenCalled();
  });

  test('When moving an item succeeds and the task logger is enabled, then the task is marked as successful', async () => {
    const fileItem: MoveItemPayload = {
      ...getDriveItemData({ uuid: 'file-uuid-success', isFolder: false, folderUuid: 'source-folder-uuid' }),
    };
    const expectedTaskId = 'task-id-success';
    mockTasksCreate.mockReturnValue(expectedTaskId);

    await dispatchThunk({ items: [fileItem], destinationFolderId, displayTaskLogger: true });

    expect(mockTasksUpdate).toHaveBeenCalledWith({
      taskId: expectedTaskId,
      merge: { status: TaskStatus.Success },
    });
  });

  test('When moving an item succeeds and the task logger is disabled, then no task status update is made for success', async () => {
    const fileItem: MoveItemPayload = {
      ...getDriveItemData({ uuid: 'file-uuid-success-no-logger', isFolder: false, folderUuid: 'source-folder-uuid' }),
    };

    await dispatchThunk({ items: [fileItem], destinationFolderId, displayTaskLogger: false });

    expect(mockTasksUpdate).not.toHaveBeenCalledWith(
      expect.objectContaining({ merge: { status: TaskStatus.Success } }),
    );
  });

  test('When moving an item fails and the task logger is enabled, then the task is marked as errored', async () => {
    const fileItem: MoveItemPayload = {
      ...getDriveItemData({ uuid: 'file-uuid-fail', isFolder: false, folderUuid: 'source-folder-uuid' }),
    };
    mockMoveItem.mockRejectedValue(new Error('move failed'));

    await dispatchThunk({ items: [fileItem], destinationFolderId, displayTaskLogger: true });

    expect(mockTasksUpdate).toHaveBeenCalledWith(expect.objectContaining({ merge: { status: TaskStatus.Error } }));
  });

  test('When moving an item fails and the task logger is disabled, then no task status update is made', async () => {
    const fileItem: MoveItemPayload = {
      ...getDriveItemData({ uuid: 'file-uuid-fail-no-logger', isFolder: false, folderUuid: 'source-folder-uuid' }),
    };
    mockMoveItem.mockRejectedValue(new Error('move failed'));

    await dispatchThunk({ items: [fileItem], destinationFolderId, displayTaskLogger: false });

    expect(mockTasksUpdate).not.toHaveBeenCalledWith(expect.objectContaining({ merge: { status: TaskStatus.Error } }));
  });

  test('When moving multiple items with the task logger enabled, then a task is created for each item', async () => {
    const items: MoveItemPayload[] = [
      { ...getDriveItemData({ uuid: 'file-uuid-batch-1', isFolder: false, folderUuid: 'source-folder-uuid' }) },
      { ...getDriveItemData({ uuid: 'folder-uuid-batch-2', isFolder: true, folderUuid: 'source-folder-uuid' }) },
      { ...getDriveItemData({ uuid: 'file-uuid-batch-3', isFolder: false, folderUuid: 'source-folder-uuid' }) },
    ];

    await dispatchThunk({ items, destinationFolderId, displayTaskLogger: true });

    expect(mockTasksCreate).toHaveBeenCalledTimes(items.length);
  });
});
