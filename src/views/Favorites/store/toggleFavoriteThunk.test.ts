import { describe, test, expect, vi, beforeEach } from 'vitest';
import { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { StorageState } from 'app/store/slices/storage/storage.model';
import { DriveItemData } from 'app/drive/types';
import { StorageTypes } from '@internxt/sdk/dist/drive';

vi.mock('../services', () => ({
  setItemFavorite: vi.fn(),
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

vi.mock('app/store/slices/storage', () => ({
  storageActions: {
    patchItem: vi.fn((payload) => ({ type: 'storage/patchItem', payload })),
    addFavorites: vi.fn((payload) => ({ type: 'storage/addFavorites', payload })),
    removeFavorites: vi.fn((payload) => ({ type: 'storage/removeFavorites', payload })),
  },
  storageSelectors: {},
}));

const buildItem = (overrides: Partial<DriveItemData> = {}): DriveItemData =>
  ({
    uuid: 'file-uuid-1',
    isFolder: false,
    isFavorite: false,
    folderUuid: 'parent-folder-uuid',
    parentUuid: 'grandparent-folder-uuid',
    ...overrides,
  }) as unknown as DriveItemData;

describe('toggleFavoriteThunk', () => {
  const dispatch = vi.fn();
  const getState = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('When a non-favorited file is toggled, then it is marked as favorite and added to the favorites list', async () => {
    const { toggleFavoriteThunk } = await import('./toggleFavoriteThunk');
    const { storageActions } = await import('app/store/slices/storage');
    const { setItemFavorite } = await import('../services');

    const item = buildItem();

    await toggleFavoriteThunk([item])(dispatch, getState, undefined);

    expect(setItemFavorite).toHaveBeenCalledWith(item, true);
    expect(storageActions.patchItem).toHaveBeenCalledWith({
      uuid: item.uuid,
      folderId: item.folderUuid,
      isFolder: false,
      patch: { isFavorite: true },
    });
    expect(storageActions.addFavorites).toHaveBeenCalledWith([{ ...item, isFavorite: true }]);
    expect(storageActions.removeFavorites).not.toHaveBeenCalled();
  });

  test('When a favorited folder is toggled, then it is unmarked and removed from the favorites list using the parent uuid', async () => {
    const { toggleFavoriteThunk } = await import('./toggleFavoriteThunk');
    const { storageActions } = await import('app/store/slices/storage');
    const { setItemFavorite } = await import('../services');

    const folder = buildItem({ uuid: 'folder-uuid-1', isFolder: true, isFavorite: true });

    await toggleFavoriteThunk([folder])(dispatch, getState, undefined);

    expect(setItemFavorite).toHaveBeenCalledWith(folder, false);
    expect(storageActions.patchItem).toHaveBeenCalledWith({
      uuid: folder.uuid,
      folderId: folder.parentUuid,
      isFolder: true,
      patch: { isFavorite: false },
    });
    expect(storageActions.removeFavorites).toHaveBeenCalledWith([folder]);
    expect(storageActions.addFavorites).not.toHaveBeenCalled();
  });

  test('When multiple items are selected, then each is toggled according to its own state', async () => {
    const { toggleFavoriteThunk } = await import('./toggleFavoriteThunk');
    const { setItemFavorite } = await import('../services');

    const notFavorited = buildItem({ uuid: 'file-uuid-1' });
    const favorited = buildItem({ uuid: 'file-uuid-2', isFavorite: true });

    await toggleFavoriteThunk([notFavorited, favorited])(dispatch, getState, undefined);

    expect(setItemFavorite).toHaveBeenCalledWith(notFavorited, true);
    expect(setItemFavorite).toHaveBeenCalledWith(favorited, false);
  });

  test('When all toggle requests fail, then the errors are reported and the thunk rejects without updating the state', async () => {
    const { toggleFavoriteThunk } = await import('./toggleFavoriteThunk');
    const { storageActions } = await import('app/store/slices/storage');
    const { setItemFavorite } = await import('../services');
    const errorService = (await import('services/error.service')).default;

    const requestError = new Error('Network error');
    vi.mocked(setItemFavorite).mockRejectedValue(requestError);

    const result = await toggleFavoriteThunk([buildItem(), buildItem({ uuid: 'file-uuid-2' })])(
      dispatch,
      getState,
      undefined,
    );

    expect(errorService.reportError).toHaveBeenCalledTimes(2);
    expect(errorService.reportError).toHaveBeenCalledWith(requestError);
    expect(result.meta.requestStatus).toBe('rejected');
    expect(storageActions.patchItem).not.toHaveBeenCalled();
    expect(storageActions.addFavorites).not.toHaveBeenCalled();
    expect(storageActions.removeFavorites).not.toHaveBeenCalled();
  });

  test('When only some toggle requests fail, then the thunk fulfills flagging the partial failure and only the successful items update the state', async () => {
    const { toggleFavoriteThunk } = await import('./toggleFavoriteThunk');
    const { storageActions } = await import('app/store/slices/storage');
    const { setItemFavorite } = await import('../services');
    const errorService = (await import('services/error.service')).default;

    const failingItem = buildItem({ uuid: 'file-uuid-failing' });
    const succeedingItem = buildItem({ uuid: 'file-uuid-succeeding' });
    const requestError = new Error('Network error');
    vi.mocked(setItemFavorite).mockImplementation((item) =>
      item.uuid === failingItem.uuid
        ? Promise.reject(requestError)
        : Promise.resolve({} as StorageTypes.FavoriteStatusResponse),
    );

    const result = await toggleFavoriteThunk([failingItem, succeedingItem])(dispatch, getState, undefined);

    expect(result.meta.requestStatus).toBe('fulfilled');
    expect(result.payload).toEqual({ partiallyFailed: true });
    expect(errorService.reportError).toHaveBeenCalledWith(requestError);
    expect(storageActions.patchItem).toHaveBeenCalledTimes(1);
    expect(storageActions.patchItem).toHaveBeenCalledWith({
      uuid: succeedingItem.uuid,
      folderId: succeedingItem.folderUuid,
      isFolder: false,
      patch: { isFavorite: true },
    });
    expect(storageActions.addFavorites).toHaveBeenCalledWith([{ ...succeedingItem, isFavorite: true }]);
  });

  test('When all toggle requests succeed, then the thunk fulfills without flagging a partial failure', async () => {
    const { toggleFavoriteThunk } = await import('./toggleFavoriteThunk');

    const result = await toggleFavoriteThunk([buildItem()])(dispatch, getState, undefined);

    expect(result.meta.requestStatus).toBe('fulfilled');
    expect(result.payload).toEqual({ partiallyFailed: false });
  });
});

describe('toggleFavoriteThunkExtraReducers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const buildCallbacks = async () => {
    const { toggleFavoriteThunkExtraReducers, toggleFavoriteThunk } = await import('./toggleFavoriteThunk');

    const callbacks = new Map<string, (state: StorageState, action: { payload?: unknown }) => void>();
    const builder = {
      addCase: vi.fn().mockImplementation((actionCreator, callback) => {
        callbacks.set(actionCreator.type, callback);
        return builder;
      }),
    } as unknown as ActionReducerMapBuilder<StorageState>;

    toggleFavoriteThunkExtraReducers(builder);

    return {
      fulfilled: callbacks.get(toggleFavoriteThunk.fulfilled.type),
      rejected: callbacks.get(toggleFavoriteThunk.rejected.type),
    };
  };

  test('When the thunk is rejected, then an error toast is shown', async () => {
    const notificationsService = (await import('app/notifications/services/notifications.service')).default;

    const { rejected } = await buildCallbacks();

    rejected?.({} as StorageState, {});
    expect(notificationsService.show).toHaveBeenCalled();
  });

  test('When the thunk fulfills with a partial failure, then a partial error toast is shown', async () => {
    const notificationsService = (await import('app/notifications/services/notifications.service')).default;

    const { fulfilled } = await buildCallbacks();

    fulfilled?.({} as StorageState, { payload: { partiallyFailed: true } });
    expect(notificationsService.show).toHaveBeenCalled();
  });

  test('When the thunk fulfills without failures, then no toast is shown', async () => {
    const notificationsService = (await import('app/notifications/services/notifications.service')).default;

    const { fulfilled } = await buildCallbacks();

    fulfilled?.({} as StorageState, { payload: { partiallyFailed: false } });
    expect(notificationsService.show).not.toHaveBeenCalled();
  });
});
