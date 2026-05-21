import { describe, test, expect, vi, beforeEach } from 'vitest';
import { buildDriveItemData } from '../../../../../../test/unit/fixtures/drive.fixtures';

const mockMoveItem = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

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

import { moveItemsThunk, MoveItemPayload } from './moveItemsThunk';

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
      ...buildDriveItemData({ uuid: 'file-uuid-1', isFolder: false, folderUuid: 'source-folder-uuid' }),
      newItemName,
    };

    await dispatchThunk({ items: [fileItem], destinationFolderId });

    expect(mockMoveItem).toHaveBeenCalledWith(fileItem, destinationFolderId, newItemName);
  });

  test('When moving a file item without a new name, then the storage service receives undefined for the name', async () => {
    const destinationFolderId = 'dest-folder-uuid';
    const fileItem: MoveItemPayload = {
      ...buildDriveItemData({ uuid: 'file-uuid-2', isFolder: false, folderUuid: 'source-folder-uuid' }),
    };

    await dispatchThunk({ items: [fileItem], destinationFolderId });

    expect(mockMoveItem).toHaveBeenCalledWith(fileItem, destinationFolderId, undefined);
  });

  test('When moving a folder item that has a new name set, then the storage service receives the new name', async () => {
    const destinationFolderId = 'dest-folder-uuid';
    const newItemName = 'renamed-folder';
    const folderItem: MoveItemPayload = {
      ...buildDriveItemData({ uuid: 'folder-uuid-1', isFolder: true, folderUuid: 'source-folder-uuid' }),
      newItemName,
    };

    await dispatchThunk({ items: [folderItem], destinationFolderId });

    expect(mockMoveItem).toHaveBeenCalledWith(folderItem, destinationFolderId, newItemName);
  });

  test('When moving a folder item without a new name, then the storage service receives undefined for the name', async () => {
    const destinationFolderId = 'dest-folder-uuid';
    const folderItem: MoveItemPayload = {
      ...buildDriveItemData({ uuid: 'folder-uuid-2', isFolder: true, folderUuid: 'source-folder-uuid' }),
    };

    await dispatchThunk({ items: [folderItem], destinationFolderId });

    expect(mockMoveItem).toHaveBeenCalledWith(folderItem, destinationFolderId, undefined);
  });

  test('When moving multiple items each with distinct new names, then each item is moved with its own new name', async () => {
    const destinationFolderId = 'dest-folder-uuid';
    const fileItem: MoveItemPayload = {
      ...buildDriveItemData({ uuid: 'file-uuid-multi', isFolder: false, folderUuid: 'source-folder-uuid' }),
      newItemName: 'new-file-name',
    };
    const folderItem: MoveItemPayload = {
      ...buildDriveItemData({ uuid: 'folder-uuid-multi', isFolder: true, folderUuid: 'source-folder-uuid' }),
      newItemName: 'new-folder-name',
    };

    await dispatchThunk({ items: [fileItem, folderItem], destinationFolderId });

    expect(mockMoveItem).toHaveBeenCalledWith(fileItem, destinationFolderId, 'new-file-name');
    expect(mockMoveItem).toHaveBeenCalledWith(folderItem, destinationFolderId, 'new-folder-name');
  });
});
