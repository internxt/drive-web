import { describe, test, expect, vi, beforeEach } from 'vitest';
import { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { StorageState } from 'app/store/slices/storage/storage.model';
import { RootState } from 'app/store';
import { DriveItemData } from 'app/drive/types';

vi.mock('../services', () => ({
  fetchFavoriteFolders: vi.fn(),
  fetchFavoriteFiles: vi.fn(),
}));

vi.mock('services/error.service', () => ({
  default: {
    reportError: vi.fn(),
    castError: vi.fn((error) => error),
  },
}));

vi.mock('app/notifications/services/notifications.service', () => ({
  default: {
    show: vi.fn(),
  },
  ToastType: { Error: 'error' },
}));

vi.mock('app/crypto/services/utils', () => ({
  getItemPlainName: vi.fn(),
  excludeHiddenItems: vi.fn(),
}));

vi.mock('app/store/slices/storage', () => ({
  storageActions: {
    addFavorites: vi.fn((payload) => ({ type: 'storage/addFavorites', payload })),
    setHasMoreFavoriteFolders: vi.fn((payload) => ({ type: 'storage/setHasMoreFavoriteFolders', payload })),
    setHasMoreFavoriteFiles: vi.fn((payload) => ({ type: 'storage/setHasMoreFavoriteFiles', payload })),
  },
  storageSelectors: {},
}));

const FAVORITES_LIMIT = 50;

const getStateWith = (storage: Partial<StorageState>) =>
  vi.fn().mockReturnValue({
    storage: {
      favorites: [],
      hasMoreFavoriteFolders: true,
      hasMoreFavoriteFiles: true,
      ...storage,
    },
  } as unknown as RootState);

describe('fetchFavoritesThunk', () => {
  const dispatch = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();

    const cryptoUtils = await import('app/crypto/services/utils');

    vi.mocked(cryptoUtils.getItemPlainName).mockImplementation(
      (item) => (item as Partial<DriveItemData>).plainName ?? '',
    );
    vi.mocked(cryptoUtils.excludeHiddenItems).mockImplementation((items) => items);
  });

  test('When there are more folders to load, then favorite folders are fetched first with the offset of already loaded folders', async () => {
    const { fetchFavoritesThunk } = await import('./fetchFavoritesThunk');
    const { storageActions } = await import('app/store/slices/storage');
    const { fetchFavoriteFolders, fetchFavoriteFiles } = await import('../services');

    const mockFolders = Array.from({ length: FAVORITES_LIMIT }, (_, i) => ({
      uuid: `folder-uuid-${i + 1}`,
      name: `encrypted-folder${i + 1}`,
      plainName: `folder${i + 1}`,
    }));
    const loadedFavorites = [{ uuid: 'folder-uuid-0', isFolder: true }] as DriveItemData[];
    const getState = getStateWith({ favorites: loadedFavorites });

    vi.mocked(fetchFavoriteFolders).mockResolvedValue(
      mockFolders as unknown as Awaited<ReturnType<typeof fetchFavoriteFolders>>,
    );

    await fetchFavoritesThunk()(dispatch, getState, undefined);

    expect(fetchFavoriteFolders).toHaveBeenCalledWith(FAVORITES_LIMIT, loadedFavorites.length);
    expect(fetchFavoriteFiles).not.toHaveBeenCalled();
    expect(storageActions.addFavorites).toHaveBeenCalledWith(
      mockFolders.map((folder) => ({ ...folder, isFolder: true, name: folder.plainName })),
    );
    expect(storageActions.setHasMoreFavoriteFolders).toHaveBeenCalledWith(true);
  });

  test('When fewer folders than the limit are returned, then folders are marked as exhausted', async () => {
    const { fetchFavoritesThunk } = await import('./fetchFavoritesThunk');
    const { storageActions } = await import('app/store/slices/storage');
    const { fetchFavoriteFolders } = await import('../services');

    const mockFolders = [{ uuid: 'folder-uuid-1', name: 'encrypted-folder1', plainName: 'folder1' }];
    const getState = getStateWith({});

    vi.mocked(fetchFavoriteFolders).mockResolvedValue(
      mockFolders as unknown as Awaited<ReturnType<typeof fetchFavoriteFolders>>,
    );

    await fetchFavoritesThunk()(dispatch, getState, undefined);

    expect(storageActions.setHasMoreFavoriteFolders).toHaveBeenCalledWith(false);
  });

  test('When there are no more folders to load, then favorite files are fetched with the offset of already loaded files', async () => {
    const { fetchFavoritesThunk } = await import('./fetchFavoritesThunk');
    const { storageActions } = await import('app/store/slices/storage');
    const { fetchFavoriteFolders, fetchFavoriteFiles } = await import('../services');

    const mockFiles = [{ uuid: 'file-uuid-2', name: 'encrypted-file2.txt', plainName: 'file2.txt', size: '100' }];
    const loadedFavorites = [
      { uuid: 'folder-uuid-1', isFolder: true },
      { uuid: 'file-uuid-1', isFolder: false },
    ] as DriveItemData[];
    const getState = getStateWith({ favorites: loadedFavorites, hasMoreFavoriteFolders: false });

    vi.mocked(fetchFavoriteFiles).mockResolvedValue(
      mockFiles as unknown as Awaited<ReturnType<typeof fetchFavoriteFiles>>,
    );

    await fetchFavoritesThunk()(dispatch, getState, undefined);

    expect(fetchFavoriteFolders).not.toHaveBeenCalled();
    expect(fetchFavoriteFiles).toHaveBeenCalledWith(FAVORITES_LIMIT, 1);
    expect(storageActions.addFavorites).toHaveBeenCalledWith([
      { ...mockFiles[0], isFolder: false, size: 100, name: 'file2.txt' },
    ]);
    expect(storageActions.setHasMoreFavoriteFiles).toHaveBeenCalledWith(false);
  });

  test('When fetching favorites fails, then the error is reported and the thunk rejects with the casted error', async () => {
    const { fetchFavoritesThunk } = await import('./fetchFavoritesThunk');
    const { storageActions } = await import('app/store/slices/storage');
    const { fetchFavoriteFolders } = await import('../services');
    const errorService = (await import('services/error.service')).default;

    const fetchError = new Error('Network error');
    const getState = getStateWith({});

    vi.mocked(fetchFavoriteFolders).mockRejectedValue(fetchError);

    const result = await fetchFavoritesThunk()(dispatch, getState, undefined);

    expect(errorService.reportError).toHaveBeenCalledWith(fetchError);
    expect(errorService.castError).toHaveBeenCalledWith(fetchError);
    expect(result.meta.requestStatus).toBe('rejected');
    expect((result as { payload: unknown }).payload).toBe(fetchError);
    expect(storageActions.addFavorites).not.toHaveBeenCalled();
  });

  test('When there are no more folders nor files to load, then nothing is fetched', async () => {
    const { fetchFavoritesThunk } = await import('./fetchFavoritesThunk');
    const { storageActions } = await import('app/store/slices/storage');
    const { fetchFavoriteFolders, fetchFavoriteFiles } = await import('../services');

    const getState = getStateWith({ hasMoreFavoriteFolders: false, hasMoreFavoriteFiles: false });

    await fetchFavoritesThunk()(dispatch, getState, undefined);

    expect(fetchFavoriteFolders).not.toHaveBeenCalled();
    expect(fetchFavoriteFiles).not.toHaveBeenCalled();
    expect(storageActions.addFavorites).not.toHaveBeenCalled();
  });
});

describe('fetchFavoritesThunkExtraReducers', () => {
  test('When the thunk is pending, fulfilled, or rejected, then the loading flag is updated accordingly', async () => {
    const { fetchFavoritesThunkExtraReducers } = await import('./fetchFavoritesThunk');

    const callbacks: Array<(state: StorageState, action: { payload?: unknown }) => void> = [];
    const builder = {
      addCase: vi.fn().mockImplementation((_, callback) => {
        if (callback) callbacks.push(callback);
        return builder;
      }),
    } as unknown as ActionReducerMapBuilder<StorageState>;

    fetchFavoritesThunkExtraReducers(builder);

    expect(builder.addCase).toHaveBeenCalledTimes(3);

    const pendingState = { isLoadingFavorites: false } as StorageState;
    callbacks[0](pendingState, {});
    expect(pendingState.isLoadingFavorites).toBe(true);

    const fulfilledState = { isLoadingFavorites: true } as StorageState;
    callbacks[1](fulfilledState, {});
    expect(fulfilledState.isLoadingFavorites).toBe(false);

    const rejectedState = { isLoadingFavorites: true } as StorageState;
    callbacks[2](rejectedState, {});
    expect(rejectedState.isLoadingFavorites).toBe(false);
  });
});
