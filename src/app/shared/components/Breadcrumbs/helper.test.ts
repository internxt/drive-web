import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  canItemDrop,
  getFolderPath,
  getItemsToMoveWhenNotSelected,
  getItemsToMoveWhenSelected,
  onItemDropped,
} from './helper';
import { BreadcrumbItemData } from '@internxt/ui';
import { DriveItemData } from 'app/drive/types';
import { AppDispatch } from 'app/store';
import { DragAndDropType } from 'app/core/types';
import { DropTargetMonitor } from 'react-dnd';
import { NativeTypes } from 'react-dnd-html5-backend';
import { storageActions } from 'app/store/slices/storage';
import storageThunks from 'app/store/slices/storage/storage.thunks';

vi.mock('app/store/slices/storage', () => ({
  storageActions: {
    setMoveDestinationFolderId: vi.fn(),
  },
}));

vi.mock('app/store/slices/storage/storage.thunks', () => ({
  default: {
    moveItemsThunk: vi.fn(),
    uploadItemsThunk: vi.fn(),
    uploadFolderThunk: vi.fn(),
  },
}));

vi.mock('app/store/slices/storage/storage.thunks/renameItemsThunk', () => ({
  handleRepeatedUploadingFiles: vi.fn().mockResolvedValue([]),
  handleRepeatedUploadingFolders: vi.fn().mockResolvedValue([]),
}));

vi.mock('app/core/services/drag-and-drop.service', () => ({
  transformDraggedItems: vi.fn().mockResolvedValue({ rootList: [], files: [] }),
}));

const createMockBreadcrumbItem = (overrides?: Partial<BreadcrumbItemData>): BreadcrumbItemData => ({
  uuid: 'folder-123',
  label: 'Test Folder',
  icon: null,
  active: false,
  ...overrides,
});

const createMockDriveItem = (overrides?: Partial<DriveItemData>): DriveItemData => ({
  bucket: 'bucket123',
  createdAt: 'mockDate',
  created_at: 'mockDate',
  deleted: false,
  deletedAt: null,
  encrypt_version: '1',
  id: 1,
  name: 'file1.txt',
  plain_name: 'file1.txt',
  plainName: 'file1.txt',
  size: 1024,
  type: 'text/plain',
  updatedAt: 'mockDate',
  status: 'active',
  uuid: 'file-uuid-123',
  fileId: 'file1',
  folderId: 123,
  folder_id: 123,
  folderUuid: 'folderUuid123',
  thumbnails: [],
  currentThumbnail: null,
  shares: [],
  sharings: [],
  color: null,
  icon: null,
  iconId: null,
  isFolder: false,
  parentId: 123,
  parentUuid: 'parent-uuid-123',
  userId: 456,
  user_id: 456,
  icon_id: 789,
  parent_id: 123,
  ...overrides,
});

const mockDispatch = vi.fn() as unknown as AppDispatch;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('getFolderPath', () => {
  it('should return the correct folder path based on breadcrumb and namePath', () => {
    const item = createMockBreadcrumbItem();
    const namePath = [
      { uuid: 'root', name: 'Root' },
      { uuid: 'folder-123', name: 'Test Folder' },
    ];

    const folderPath = getFolderPath(item, namePath);
    expect(folderPath).toBe('/Test Folder');
  });

  it('should return the root path if the item is not in the namePath', () => {
    const item = createMockBreadcrumbItem({ uuid: 'not-found' });
    const namePath = [
      { uuid: 'root', name: 'Root' },
      { uuid: 'folder-123', name: 'Test Folder' },
    ];

    const folderPath = getFolderPath(item, namePath);
    expect(folderPath).toBe('');
  });
});

describe('getItemsToMove', () => {
  it('should return a unique list of items when some items are selected', () => {
    const item1 = createMockDriveItem({ id: 1 });
    const item2 = createMockDriveItem({ id: 2, name: 'file2.txt', uuid: 'file-uuid-456' });
    const item3 = createMockDriveItem({ id: 1 });
    const droppedData = item1;
    const selectedItems = [item2, item3];

    const result = getItemsToMoveWhenSelected(droppedData, selectedItems);
    expect(result).toEqual([item2, droppedData]);
  });

  it('should return only the dropped data when no items are selected', () => {
    const droppedData = createMockDriveItem();

    const result = getItemsToMoveWhenNotSelected(droppedData);
    expect(result).toEqual([droppedData]);
  });

  it('should filter out duplicate items based on id and isFolder', () => {
    const droppedData = createMockDriveItem({ id: 3, name: 'file3.txt', uuid: 'file-uuid-789' });
    const selectedItems = [
      createMockDriveItem({ id: 1, isFolder: true }),
      createMockDriveItem({ id: 3, name: 'file3.txt', uuid: 'file-uuid-789' }),
    ];

    const result = getItemsToMoveWhenSelected(droppedData, selectedItems);
    expect(result).toEqual([createMockDriveItem({ id: 1, isFolder: true }), droppedData]);
  });
});

describe('onItemDropped', () => {
  it('should handle DriveItem drop correctly', async () => {
    const item: BreadcrumbItemData = createMockBreadcrumbItem({ uuid: '1', label: 'Folder' });
    const namePath = [{ uuid: 'folder-uuid', name: 'Folder' }];
    const selectedItems: DriveItemData[] = [createMockDriveItem({ id: 2, isFolder: false })];
    const draggedItem: DriveItemData = createMockDriveItem({ id: 3, isFolder: false });
    const monitor = {
      getItemType: () => DragAndDropType.DriveItem,
      getItem: () => vi.fn().mockReturnValue(draggedItem),
    } as unknown as DropTargetMonitor;

    await onItemDropped(item, namePath, true, selectedItems, mockDispatch)(draggedItem, monitor);

    expect(storageActions.setMoveDestinationFolderId).toHaveBeenCalledWith(item.uuid);
    expect(storageThunks.moveItemsThunk).toHaveBeenCalled();
  });

  it('should handle file drop correctly', async () => {
    const item: BreadcrumbItemData = createMockBreadcrumbItem({ uuid: '1', label: 'Folder' });
    const namePath = [{ uuid: 'folder-uuid', name: 'Folder' }];
    const draggedItem: unknown = { files: ['file1'], items: [] };
    const monitor = {
      getItemType: () => NativeTypes.FILE,
      getItem: () => draggedItem,
    } as unknown as DropTargetMonitor;

    vi.mock('app/core/services/drag-and-drop.service', () => ({
      transformDraggedItems: vi.fn().mockResolvedValue({ rootList: [], files: ['file1'] }),
    }));

    await onItemDropped(item, namePath, false, [], mockDispatch)(draggedItem, monitor);

    expect(storageThunks.uploadItemsThunk).toHaveBeenCalled();
  });
});

describe('canItemDrop', () => {
  it('should return true if the dragged item is a file', () => {
    const item = { uuid: 123, label: 'Folder' };
    const draggedItem: DriveItemData = createMockDriveItem({ parentId: 123, isFolder: true });
    const monitor = { getItemType: () => NativeTypes.FILE } as DropTargetMonitor;

    const result = canItemDrop(item)(draggedItem, monitor);

    expect(result).toBe(true);
  });

  it('should return true if the dragged item is a file or if the parent id is different', () => {
    const item = { uuid: 123, label: 'Folder' };
    const draggedItem: DriveItemData = createMockDriveItem({ parentId: 456, isFolder: true });
    const monitor = { getItemType: () => DragAndDropType.DriveItem } as DropTargetMonitor;

    const result = canItemDrop(item)(draggedItem, monitor);

    expect(result).toBe(true);
  });

  it('should return false if the dragged item has the same parent id', () => {
    const item = { uuid: 123, label: 'Folder' };
    const draggedItem: DriveItemData = createMockDriveItem({ parentId: 123, isFolder: true });
    const monitor = { getItemType: () => DragAndDropType.DriveItem } as DropTargetMonitor;

    const result = canItemDrop(item)(draggedItem, monitor);

    expect(result).toBe(false);
  });
});
