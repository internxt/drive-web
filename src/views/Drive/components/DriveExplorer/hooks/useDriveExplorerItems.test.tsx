import { ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import storageReducer, { storageActions } from 'app/store/slices/storage';
import { fetchPaginatedFolderContentThunk } from 'app/store/slices/storage/storage.thunks/fetchFolderContentThunk';
import { OrderDirection } from 'app/core/types';
import { fetchFavoritesThunk } from 'views/Favorites/store/fetchFavoritesThunk';
import { useDriveExplorerItems } from './useDriveExplorerItems';

vi.mock('app/store/slices/fileVersions', () => ({
  fileVersionsSelectors: { getMaxFileSizeLimit: vi.fn() },
}));
vi.mock('app/store/slices/workspaces/workspaces.selectors', () => ({
  default: { getSelectedWorkspace: vi.fn() },
}));
vi.mock('app/store/slices/storage/storage.thunks/fetchFolderContentThunk', () => ({
  fetchPaginatedFolderContentThunk: vi.fn(),
  fetchFolderContentThunkExtraReducers: vi.fn(),
}));
vi.mock('views/Favorites/store/fetchFavoritesThunk', () => ({
  fetchFavoritesThunk: vi.fn(),
  fetchFavoritesThunkExtraReducers: vi.fn(),
}));

const PAGE_SIZE = 50;
const FOLDER = { uuid: 'work-uuid', name: 'Work' };
const OTHER_FOLDER = { uuid: 'reports-uuid', name: 'Reports' };

type Store = ReturnType<typeof createStore>;
type RequestedPage = { folderId?: string; type: 'folders' | 'files'; offset?: number };

const createStore = () => configureStore({ reducer: { storage: storageReducer } });

const serveDrivePages = (store: Store, requestedPages: RequestedPage[], foldersWithMorePages: string[] = []) =>
  vi.mocked(fetchPaginatedFolderContentThunk).mockImplementation(((folderId: string) => async () => {
    const hasMoreFolders = store.getState().storage.hasMoreDriveFolders[folderId] ?? true;
    requestedPages.push({ folderId, type: hasMoreFolders ? 'folders' : 'files' });
    await Promise.resolve();
    store.dispatch(
      hasMoreFolders
        ? storageActions.setHasMoreDriveFolders({ folderId, status: foldersWithMorePages.includes(folderId) })
        : storageActions.setHasMoreDriveFiles({ folderId, status: false }),
    );
  }) as never);

const serveFavoritePages = (store: Store, requestedPages: RequestedPage[]) =>
  vi.mocked(fetchFavoritesThunk).mockImplementation((() => async () => {
    const { hasMoreFavoriteFolders, favorites } = store.getState().storage;
    requestedPages.push({ type: hasMoreFavoriteFolders ? 'folders' : 'files', offset: favorites.length });
    await Promise.resolve();
    store.dispatch(
      hasMoreFavoriteFolders
        ? storageActions.setHasMoreFavoriteFolders(false)
        : storageActions.setHasMoreFavoriteFiles(false),
    );
  }) as never);

const serveTrashPages = (store: Store, requestedPages: RequestedPage[], { folders = 0, files = 0 }) =>
  vi.fn(async (limit: number, offset: number | undefined, type: 'files' | 'folders') => {
    requestedPages.push({ type, offset });
    await Promise.resolve();
    const total = type === 'folders' ? folders : files;
    const retrieved = Math.max(0, Math.min(limit, total - (offset ?? 0)));
    store.dispatch(
      type === 'folders'
        ? storageActions.addFoldersOnTrashLength(retrieved)
        : storageActions.addFilesOnTrashLength(retrieved),
    );
    return { finished: retrieved < limit, itemsRetrieved: retrieved };
  });

const renderItems = (store: Store, props: Partial<Parameters<typeof useDriveExplorerItems>[0]> = {}) =>
  renderHook(
    () => useDriveExplorerItems({ isTrash: false, isFavorites: false, isRecents: false, isLoading: false, ...props }),
    { wrapper: ({ children }: { children: ReactNode }) => <Provider store={store}>{children}</Provider> },
  );

const letPendingLoadsFinish = () => act(() => new Promise((resolve) => setTimeout(resolve, 20)));

describe('Loading the items of the Drive explorer', () => {
  let store: Store;
  let requestedPages: RequestedPage[];

  beforeEach(() => {
    vi.clearAllMocks();
    store = createStore();
    store.dispatch(storageActions.setNamePath([FOLDER]));
    requestedPages = [];
    serveDrivePages(store, requestedPages);
    serveFavoritePages(store, requestedPages);
  });

  test('When the user opens a folder, then its folders and then its files are requested once each', async () => {
    renderItems(store);
    await letPendingLoadsFinish();

    expect(requestedPages).toStrictEqual([
      { folderId: FOLDER.uuid, type: 'folders' },
      { folderId: FOLDER.uuid, type: 'files' },
    ]);
  });

  test('When the user comes back to a folder whose folders were already loaded, then its files are requested only once', async () => {
    store.dispatch(storageActions.setHasMoreDriveFolders({ folderId: FOLDER.uuid, status: false }));

    renderItems(store);
    await letPendingLoadsFinish();

    expect(requestedPages).toStrictEqual([{ folderId: FOLDER.uuid, type: 'files' }]);
  });

  test('When the user moves to another folder, then the new folder is loaded once', async () => {
    serveDrivePages(store, requestedPages, [FOLDER.uuid]);
    store.dispatch(storageActions.setHasMoreDriveFolders({ folderId: OTHER_FOLDER.uuid, status: false }));
    renderItems(store);
    await letPendingLoadsFinish();
    requestedPages.length = 0;

    act(() => {
      store.dispatch(storageActions.setNamePath([FOLDER, OTHER_FOLDER]));
    });
    await letPendingLoadsFinish();

    expect(requestedPages).toStrictEqual([{ folderId: OTHER_FOLDER.uuid, type: 'files' }]);
  });

  test('When the sort order changes in a Drive folder, then no extra page is requested on top of the sorted reload', async () => {
    renderItems(store);
    await letPendingLoadsFinish();
    requestedPages.length = 0;

    act(() => {
      store.dispatch(storageActions.setOrder({ by: 'updatedAt', direction: OrderDirection.Desc }));
    });
    await letPendingLoadsFinish();

    expect(requestedPages).toStrictEqual([]);
  });

  test('When the user opens favorites after a previous visit, then they are listed again from the first page of folders', async () => {
    store.dispatch(storageActions.addFavorites([{ uuid: 'old-favorite', isFolder: false } as never]));
    store.dispatch(storageActions.setHasMoreFavoriteFolders(false));

    renderItems(store, { isFavorites: true });
    await letPendingLoadsFinish();

    expect(requestedPages).toStrictEqual([
      { type: 'folders', offset: 0 },
      { type: 'files', offset: 0 },
    ]);
  });

  test('When the user opens the trash, then its folders are requested once from the start', async () => {
    const getTrashPaginated = serveTrashPages(store, requestedPages, { folders: 120 });

    renderItems(store, { isTrash: true, getTrashPaginated });
    await letPendingLoadsFinish();

    expect(requestedPages).toStrictEqual([{ type: 'folders', offset: 0 }]);
  });

  test('When the user scrolls through a trash with more than one page of folders, then every page is loaded without gaps', async () => {
    const getTrashPaginated = serveTrashPages(store, requestedPages, { folders: 120, files: 10 });
    const { result } = renderItems(store, { isTrash: true, getTrashPaginated });
    await letPendingLoadsFinish();

    for (let page = 0; page < 2; page++) {
      act(() => result.current.loadMoreItems());
      await letPendingLoadsFinish();
    }

    expect(requestedPages).toStrictEqual([
      { type: 'folders', offset: 0 },
      { type: 'folders', offset: PAGE_SIZE },
      { type: 'folders', offset: 2 * PAGE_SIZE },
      { type: 'files', offset: 0 },
    ]);
    expect(result.current.hasMoreItemsToLoad).toBe(false);
  });

  test('When the sort order changes in the trash after reaching its files, then it is listed again from the first page of folders', async () => {
    const getTrashPaginated = serveTrashPages(store, requestedPages, { folders: 10, files: 120 });
    renderItems(store, { isTrash: true, getTrashPaginated });
    await letPendingLoadsFinish();
    requestedPages.length = 0;

    act(() => {
      store.dispatch(storageActions.setOrder({ by: 'updatedAt', direction: OrderDirection.Desc }));
    });
    await letPendingLoadsFinish();

    expect(requestedPages).toStrictEqual([
      { type: 'folders', offset: 0 },
      { type: 'files', offset: 0 },
    ]);
  });

  test('When the user opens recents, then no folder content is requested and the empty state can show as soon as recents are loaded', async () => {
    const { result } = renderItems(store, { isRecents: true });
    await letPendingLoadsFinish();

    act(() => result.current.loadMoreItems());
    await letPendingLoadsFinish();

    expect(requestedPages).toStrictEqual([]);
    expect(result.current.hasMoreItemsToLoad).toBe(false);
    expect(result.current.isEmptyFolder).toBe(true);
  });

  test('When the trash is cleared, then there is nothing else to load', async () => {
    const getTrashPaginated = serveTrashPages(store, requestedPages, { folders: 120 });
    const { result } = renderItems(store, { isTrash: true, getTrashPaginated });
    await letPendingLoadsFinish();

    act(() => result.current.onTrashCleared());

    await waitFor(() => expect(result.current.isEmptyFolder).toBe(true));
    expect(store.getState().storage.itemsOnTrash).toStrictEqual([]);
  });
});
