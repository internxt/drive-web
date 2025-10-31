import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { useBackupListActions } from './useBackupListActions';
import { backupsActions } from '../store/backupsSlice';
import { DriveItemData } from 'app/drive/types';
import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';

vi.mock('../store/backupsSlice', () => ({
  backupsActions: {
    setCurrentFolder: vi.fn((payload) => ({ type: 'backups/setCurrentFolder', payload })),
  },
}));

describe('useBackupListActions', () => {
  let onBreadcrumbFolderChanges: Mock;
  let dispatch: Mock;

  const mockFile = {
    id: 1,
    uuid: 'file-uuid-123',
    isFolder: false,
    name: 'test-file.txt',
  } as DriveItemData;

  const mockFolder = {
    id: 2,
    uuid: 'folder-uuid-456',
    isFolder: true,
    name: 'test-folder',
  } as DriveItemData;

  beforeEach(() => {
    vi.clearAllMocks();
    onBreadcrumbFolderChanges = vi.fn();
    dispatch = vi.fn();
  });

  it('should start with no folder selected, no items selected, and file viewer closed', () => {
    const { result } = renderHook(() => useBackupListActions(onBreadcrumbFolderChanges, dispatch));

    expect(result.current.folderUuid).toBeUndefined();
    expect(result.current.selectedItems).toEqual([]);
    expect(result.current.itemToPreview).toBeUndefined();
    expect(result.current.isFileViewerOpen).toBe(false);
  });

  it('should navigate to a different folder when folder identifier changes', () => {
    const { result } = renderHook(() => useBackupListActions(onBreadcrumbFolderChanges, dispatch));

    act(() => {
      result.current.onFolderUuidChanges('new-folder-uuid');
    });

    expect(result.current.folderUuid).toBe('new-folder-uuid');

    act(() => {
      result.current.onFolderUuidChanges(undefined);
    });

    expect(result.current.folderUuid).toBeUndefined();
  });

  it('should navigate into a folder and update navigation breadcrumbs', () => {
    const { result } = renderHook(() => useBackupListActions(onBreadcrumbFolderChanges, dispatch));

    act(() => {
      result.current.onItemClicked(mockFolder);
    });

    expect(onBreadcrumbFolderChanges).toHaveBeenCalled();
    const callback = onBreadcrumbFolderChanges.mock.calls[0][0];
    const currentFolders = [{ id: 1, uuid: 'prev-folder', isFolder: true } as DriveItemData] as DriveFolderData[];
    const newBreadcrumbs = callback(currentFolders);
    expect(newBreadcrumbs).toEqual([...currentFolders, mockFolder]);
    expect(dispatch).toHaveBeenCalledWith(backupsActions.setCurrentFolder(mockFolder));
    expect(result.current.folderUuid).toBe(mockFolder.uuid);
  });

  it('should open preview when clicking on a file', () => {
    const { result } = renderHook(() => useBackupListActions(onBreadcrumbFolderChanges, dispatch));

    act(() => {
      result.current.onItemClicked(mockFile);
    });

    expect(result.current.itemToPreview).toEqual(mockFile);
    expect(result.current.isFileViewerOpen).toBe(true);
    expect(onBreadcrumbFolderChanges).not.toHaveBeenCalled();
  });

  it('should close file preview and reset preview state', () => {
    const { result } = renderHook(() => useBackupListActions(onBreadcrumbFolderChanges, dispatch));

    act(() => {
      result.current.onItemClicked(mockFile);
    });

    expect(result.current.isFileViewerOpen).toBe(true);
    expect(result.current.itemToPreview).toEqual(mockFile);

    act(() => {
      result.current.onCloseFileViewer();
    });

    expect(result.current.isFileViewerOpen).toBe(false);
    expect(result.current.itemToPreview).toBeUndefined();
  });

  it('should select and deselect multiple items', () => {
    const { result } = renderHook(() => useBackupListActions(onBreadcrumbFolderChanges, dispatch));

    const item1 = { ...mockFile, id: 1 };
    const item2 = { ...mockFile, id: 2 };
    const item3 = { ...mockFile, id: 3 };

    act(() => {
      result.current.onItemSelected([
        { device: item1, isSelected: true },
        { device: item2, isSelected: true },
        { device: item3, isSelected: true },
      ]);
    });

    expect(result.current.selectedItems).toHaveLength(3);

    act(() => {
      result.current.onItemSelected([{ device: item1, isSelected: true }]);
    });

    expect(result.current.selectedItems).toHaveLength(3);

    act(() => {
      result.current.onItemSelected([
        { device: item1, isSelected: false },
        { device: item3, isSelected: false },
      ]);
    });

    expect(result.current.selectedItems).toEqual([item2]);
  });

  it('should update selection state when items are checked or unchecked', () => {
    const { result } = renderHook(() => useBackupListActions(onBreadcrumbFolderChanges, dispatch));

    const item1 = { ...mockFile, id: 1 };
    const item2 = { ...mockFile, id: 2 };

    act(() => {
      result.current.onSelectedItemsChanged([
        { props: item1, value: true },
        { props: item2, value: true },
      ]);
    });

    expect(result.current.selectedItems).toEqual([item1, item2]);

    act(() => {
      result.current.onSelectedItemsChanged([{ props: item1, value: false }]);
    });

    expect(result.current.selectedItems).toEqual([item2]);
  });

  it('should deselect all items when selection is cleared', () => {
    const { result } = renderHook(() => useBackupListActions(onBreadcrumbFolderChanges, dispatch));

    const item1 = { ...mockFile, id: 1 };
    const item2 = { ...mockFile, id: 2 };

    act(() => {
      result.current.onItemSelected([
        { device: item1, isSelected: true },
        { device: item2, isSelected: true },
      ]);
    });

    expect(result.current.selectedItems).toHaveLength(2);

    act(() => {
      result.current.clearSelectedItems();
    });

    expect(result.current.selectedItems).toEqual([]);
  });
});
