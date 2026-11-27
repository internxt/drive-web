import { renderHook } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { useFolderFetchRecovery } from './useFolderFetchRecovery';

const mockDispatch = vi.fn();
let mockStorageState: { hasFetchFailedByFolderId: Record<string, boolean> };

vi.mock('app/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: unknown) => unknown) => selector({ storage: mockStorageState }),
}));

vi.mock('app/store/slices/storage/storage.thunks/fetchFolderContentThunk', () => ({
  fetchPaginatedFolderContentThunk: vi.fn((folderId: string) => ({ type: 'fetchFolderContent', payload: folderId })),
}));

const FOLDER_ID = 'folder-uuid';

const renderRecovery = ({ hasFetchFailed = false, isDriveFolder = true } = {}) => {
  mockStorageState = { hasFetchFailedByFolderId: { [FOLDER_ID]: hasFetchFailed } };

  return renderHook(() => useFolderFetchRecovery({ folderId: FOLDER_ID, hasMoreItems: true, isDriveFolder }));
};

describe('Recovering a folder whose content failed to load', () => {
  test('when the folder content failed to load, then the list stops asking for more items', () => {
    const { result } = renderRecovery({ hasFetchFailed: true });

    expect(result.current.canRequestMorePages).toBe(false);
  });

  test('when the browser comes back online after the folder failed to load, then the folder is requested again once', () => {
    renderRecovery({ hasFetchFailed: true });

    globalThis.dispatchEvent(new Event('online'));

    expect(mockDispatch).toHaveBeenCalledExactlyOnceWith({ type: 'fetchFolderContent', payload: FOLDER_ID });
  });

  test('when the list is unmounted after the folder failed to load, then coming back online requests nothing', () => {
    const { unmount } = renderRecovery({ hasFetchFailed: true });

    unmount();
    globalThis.dispatchEvent(new Event('online'));

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  test('when the failed folder loads fine on rerender, then coming back online requests nothing', () => {
    const { rerender } = renderRecovery({ hasFetchFailed: true });

    mockStorageState = { hasFetchFailedByFolderId: { [FOLDER_ID]: false } };
    rerender();
    globalThis.dispatchEvent(new Event('online'));

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  test('when the list moves to another folder after the failure, then coming back online requests nothing', () => {
    const OTHER_FOLDER_ID = 'other-folder-uuid';
    mockStorageState = { hasFetchFailedByFolderId: { [FOLDER_ID]: true, [OTHER_FOLDER_ID]: false } };
    const { rerender } = renderHook(
      ({ folderId }) => useFolderFetchRecovery({ folderId, hasMoreItems: true, isDriveFolder: true }),
      { initialProps: { folderId: FOLDER_ID } },
    );

    rerender({ folderId: OTHER_FOLDER_ID });
    globalThis.dispatchEvent(new Event('online'));

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  test('when the browser comes back online and the folder loaded fine, then nothing is requested', () => {
    const { result } = renderRecovery();

    globalThis.dispatchEvent(new Event('online'));

    expect(result.current.canRequestMorePages).toBe(true);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  test('when the trash or favorites list is shown, then a failed folder load does not stop its paging', () => {
    const { result } = renderRecovery({ hasFetchFailed: true, isDriveFolder: false });

    globalThis.dispatchEvent(new Event('online'));

    expect(result.current.canRequestMorePages).toBe(true);
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
