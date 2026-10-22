import { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import storageReducer, { storageActions } from 'app/store/slices/storage';
import { fetchSortedFolderContentThunk } from 'app/store/slices/storage/storage.thunks/fetchSortedFolderContentThunk';
import { DriveItemData } from 'app/drive/types';
import { moveItemsToTrash } from 'views/Trash/services';
import { REFRESH_AFTER_CHANGE_DELAY_MS, useRefreshDriveExplorerItems } from './useRefreshDriveExplorerItems';
import { useStopSharingAndTrash } from './useStopSharingAndTrash';

vi.mock('app/store/slices/fileVersions', () => ({
  fileVersionsSelectors: { getMaxFileSizeLimit: vi.fn() },
}));
vi.mock('app/store/slices/workspaces/workspaces.selectors', () => ({
  default: { getSelectedWorkspace: vi.fn() },
}));
vi.mock('app/store/slices/storage/storage.thunks/fetchSortedFolderContentThunk', () => ({
  fetchSortedFolderContentThunk: vi.fn((folderId: string) => ({ type: 'reloadFolder', payload: folderId })),
}));
vi.mock('views/Trash/services', () => ({ moveItemsToTrash: vi.fn(() => Promise.resolve()) }));

const FOLDER = { uuid: 'work-uuid', name: 'Work' };

const renderRefresh = (fetchFolderContent?: () => void) => {
  const store = configureStore({ reducer: { storage: storageReducer } });
  store.dispatch(storageActions.setNamePath([FOLDER]));

  return renderHook(
    () => {
      const refresh = useRefreshDriveExplorerItems(fetchFolderContent);
      return { ...refresh, ...useStopSharingAndTrash(refresh.refreshItemsAfterChange) };
    },
    { wrapper: ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider> },
  );
};

const waitForRefreshDelay = () => act(() => vi.advanceTimersByTime(REFRESH_AFTER_CHANGE_DELAY_MS));

describe('Refreshing the Drive explorer after a change', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('When an item changes in a view with its own list, then only that list is reloaded after a short delay', async () => {
    const reloadViewList = vi.fn();
    const { result } = renderRefresh(reloadViewList);

    act(() => result.current.refreshItemsAfterChange());
    expect(reloadViewList).not.toHaveBeenCalled();
    await waitForRefreshDelay();

    expect(reloadViewList).toHaveBeenCalledOnce();
    expect(fetchSortedFolderContentThunk).not.toHaveBeenCalled();
  });

  test('When an item changes in a Drive folder, then that folder is reloaded once after a short delay', async () => {
    const { result } = renderRefresh();

    act(() => result.current.refreshItemsAfterChange());
    await waitForRefreshDelay();

    expect(fetchSortedFolderContentThunk).toHaveBeenCalledOnce();
    expect(fetchSortedFolderContentThunk).toHaveBeenCalledWith(FOLDER.uuid);
  });

  test('When items are moved from a view with its own list, then that list is reloaded right away', () => {
    const reloadViewList = vi.fn();
    const { result } = renderRefresh(reloadViewList);

    act(() => result.current.refreshItems());

    expect(reloadViewList).toHaveBeenCalledOnce();
    expect(fetchSortedFolderContentThunk).not.toHaveBeenCalled();
  });

  test('When the user stops sharing items and moves them to the trash, then they are moved and the view is reloaded', async () => {
    const sharedItems = [{ uuid: 'shared-file', isFolder: false } as DriveItemData];
    const reloadViewList = vi.fn();
    const { result } = renderRefresh(reloadViewList);
    act(() => result.current.openStopSharingConfirmation());

    await act(() => result.current.moveItemsToTrashOnStopSharing(sharedItems));
    await waitForRefreshDelay();

    expect(moveItemsToTrash).toHaveBeenCalledWith(sharedItems);
    expect(reloadViewList).toHaveBeenCalledOnce();
  });
});
