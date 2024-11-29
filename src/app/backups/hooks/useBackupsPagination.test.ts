/**
 * @jest-environment jsdom
 */

import { FetchFolderContentResponse } from '@internxt/sdk/dist/drive/storage/types';
import { renderHook, waitFor } from '@testing-library/react';
import _ from 'lodash';

// ESTO ESTA DIFERENTE, MIAR PR POR SI NO SIRVE ESTO---------------------
import { act } from 'react-dom/test-utils';
import { beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import newStorageService from '../../drive/services/new-storage.service';
import { DriveItemData } from '../../drive/types';
import notificationsService, { ToastType } from '../../notifications/services/notifications.service';
import { useBackupsPagination } from './useBackupsPagination';

vi.mock('../../notifications/services/notifications.service', () => ({
  default: {
    show: vi.fn(),
  },
  ToastType: {
    Error: 'ERROR',
  },
}));

vi.mock('../../drive/services/new-storage.service', () => ({
  default: {
    getFolderContentByUuid: vi.fn(),
  },
}));

vi.mock('../../core/services/error.service', () => ({
  default: {
    reportError: vi.fn(),
  },
}));

describe('useBackupsPagination', () => {
  const clearSelectedItems = vi.fn();

  const FOLDER_CONTENT_1 = {
    files: Array.from({ length: 30 }, (_, i) => ({ plainName: `file-${i + 1}.txt` })),
    children: Array.from({ length: 25 }, (_, i) => ({ plainName: `folder-${i + 1}` })),
  } as unknown as FetchFolderContentResponse;

  const FOLDER_CONTENT_2 = {
    files: Array.from({ length: 20 }, (_, i) => ({ plainName: `file-${i + 31}.txt` })),
    children: Array.from({ length: 0 }, () => []),
  } as unknown as FetchFolderContentResponse;

  const LIMIT_OF_ITEMS_FETCHED = 50;

  const FOLDER_CONTENT_1_LENGTH = _.concat(
    FOLDER_CONTENT_1.files as DriveItemData[],
    FOLDER_CONTENT_1.children as DriveItemData[],
  ).length;
  const FOLDER_CONTENT_2_LENGTH = FOLDER_CONTENT_2.files.length;
  const TOTAL_LENGTH = FOLDER_CONTENT_1_LENGTH + FOLDER_CONTENT_2_LENGTH;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Should not fetch more items as there are less than 50 items in total', async () => {
    (newStorageService.getFolderContentByUuid as Mock).mockReturnValue([
      Promise.resolve(FOLDER_CONTENT_2),
      { cancel: vi.fn() },
    ]);

    const { result } = renderHook(() => useBackupsPagination('some-folder-uuid', clearSelectedItems));

    await waitFor(() => {
      expect(result.current.hasMoreItems).toBe(false);
    });
  });

  it('Should load the first items and contains more items to fetch paginated', async () => {
    (newStorageService.getFolderContentByUuid as Mock).mockReturnValue([
      Promise.resolve(FOLDER_CONTENT_1),
      { cancel: vi.fn() },
    ]);

    const { result } = renderHook(() => useBackupsPagination('some-folder-uuid', clearSelectedItems));

    await waitFor(() => {
      expect(result.current.areFetchingItems).toBe(true);
    });

    expect(newStorageService.getFolderContentByUuid as Mock).toHaveBeenCalledWith({
      folderUuid: 'some-folder-uuid',
      limit: 50,
      offset: 0,
    });

    await waitFor(() => {
      expect(result.current.currentItems.length).toEqual(FOLDER_CONTENT_1_LENGTH);
    });

    await waitFor(() => {
      expect(result.current.hasMoreItems).toBe(true);
      expect(result.current.areFetchingItems).toBe(false);
    });
  });

  it('Should fetch more items if there are more than 50 items', async () => {
    (newStorageService.getFolderContentByUuid as Mock).mockReturnValueOnce([
      Promise.resolve(FOLDER_CONTENT_1),
      { cancel: vi.fn() },
    ]);

    const { result } = renderHook(() => useBackupsPagination('some-folder-uuid', clearSelectedItems));

    await act(async () => {
      await result.current.getFolderContent(true);
    });

    await waitFor(() => {
      expect(result.current.currentItems.length > LIMIT_OF_ITEMS_FETCHED).toBeTruthy();
    });

    (newStorageService.getFolderContentByUuid as Mock).mockReturnValueOnce([
      Promise.resolve(FOLDER_CONTENT_2),
      { cancel: vi.fn() },
    ]);

    await act(async () => {
      await result.current.getMorePaginatedItems();
    });

    await waitFor(() => {
      expect(result.current.currentItems.length === TOTAL_LENGTH).toBeTruthy();
    });
  });

  it('should run the clean function when navigating to a subfolder', async () => {
    const { rerender } = renderHook((folderUuid) => useBackupsPagination(folderUuid, clearSelectedItems), {
      initialProps: 'folder-1',
    });

    expect(clearSelectedItems).toHaveBeenCalledTimes(1);

    await act(async () => {
      rerender('folder-2');
    });

    expect(clearSelectedItems).toHaveBeenCalledTimes(2);
  });

  it('should update current items list by removing an item', async () => {
    (newStorageService.getFolderContentByUuid as Mock).mockReturnValueOnce([
      Promise.resolve(FOLDER_CONTENT_1),
      { cancel: vi.fn() },
    ]);

    const { result } = renderHook(() => useBackupsPagination('some-folder-uuid', clearSelectedItems));

    const updatedItems = result.current.currentItems.filter((item) => item.id !== 2);

    act(() => {
      result.current.updateCurrentItemsList(updatedItems);
    });

    await waitFor(() => {
      expect(result.current.currentItems).toEqual(updatedItems);
      expect(result.current.currentItems).not.toContainEqual({ id: 2 });
    });
  });

  it('should show a notification when there is an error fetching items', async () => {
    (newStorageService.getFolderContentByUuid as Mock).mockReturnValueOnce([
      Promise.reject(new Error('Error fetching items')),
      { cancel: vi.fn() },
    ]);

    const { result } = renderHook(() => useBackupsPagination('some-folder-uuid', clearSelectedItems));

    await act(async () => {
      await result.current.getFolderContent(true);
    });

    await waitFor(() => {
      expect(notificationsService.show).toHaveBeenCalledWith({
        type: ToastType.Error,
      });
    });
  });
});
