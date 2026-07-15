import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { StorageState } from 'app/store/slices/storage/storage.model';
import { DriveItemData } from 'app/drive/types';

vi.mock('../services', () => ({
  setItemFavorite: vi.fn(),
}));

vi.mock('services/navigation.service', () => ({
  default: {
    isCurrentPath: vi.fn(() => false),
  },
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
    deselectItems: vi.fn((payload) => ({ type: 'storage/deselectItems', payload })),
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

  it('should mark a non-favorited file as favorite and add it to the favorites list', async () => {
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

  it('should unmark a favorited folder and remove it from the favorites list, using the parent uuid', async () => {
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

  it('should toggle every selected item according to its own state', async () => {
    const { toggleFavoriteThunk } = await import('./toggleFavoriteThunk');
    const { setItemFavorite } = await import('../services');

    const notFavorited = buildItem({ uuid: 'file-uuid-1' });
    const favorited = buildItem({ uuid: 'file-uuid-2', isFavorite: true });

    await toggleFavoriteThunk([notFavorited, favorited])(dispatch, getState, undefined);

    expect(setItemFavorite).toHaveBeenCalledWith(notFavorited, true);
    expect(setItemFavorite).toHaveBeenCalledWith(favorited, false);
  });

  it('should deselect an unfavorited item when it is selected on the favorites view', async () => {
    const { toggleFavoriteThunk } = await import('./toggleFavoriteThunk');
    const { storageActions } = await import('app/store/slices/storage');
    const navigationService = (await import('services/navigation.service')).default;

    const favorited = buildItem({ id: 1, uuid: 'file-uuid-1', isFavorite: true });
    vi.mocked(navigationService.isCurrentPath).mockReturnValue(true);
    getState.mockReturnValue({ storage: { selectedItems: [favorited] } });

    await toggleFavoriteThunk([favorited])(dispatch, getState, undefined);

    expect(navigationService.isCurrentPath).toHaveBeenCalledWith('favorites');
    expect(storageActions.deselectItems).toHaveBeenCalledWith([favorited]);
  });

  it('should not deselect an unfavorited item that was not selected on the favorites view', async () => {
    const { toggleFavoriteThunk } = await import('./toggleFavoriteThunk');
    const { storageActions } = await import('app/store/slices/storage');
    const navigationService = (await import('services/navigation.service')).default;

    const favorited = buildItem({ id: 1, uuid: 'file-uuid-1', isFavorite: true });
    const otherSelected = buildItem({ id: 2, uuid: 'file-uuid-2', isFavorite: true });
    vi.mocked(navigationService.isCurrentPath).mockReturnValue(true);
    getState.mockReturnValue({ storage: { selectedItems: [otherSelected] } });

    await toggleFavoriteThunk([favorited])(dispatch, getState, undefined);

    expect(storageActions.deselectItems).not.toHaveBeenCalled();
  });

  it('should keep the selection when unfavoriting from a view other than favorites', async () => {
    const { toggleFavoriteThunk } = await import('./toggleFavoriteThunk');
    const { storageActions } = await import('app/store/slices/storage');
    const navigationService = (await import('services/navigation.service')).default;

    const favorited = buildItem({ id: 1, uuid: 'file-uuid-1', isFavorite: true });
    vi.mocked(navigationService.isCurrentPath).mockReturnValue(false);

    await toggleFavoriteThunk([favorited])(dispatch, getState, undefined);

    expect(storageActions.removeFavorites).toHaveBeenCalledWith([favorited]);
    expect(storageActions.deselectItems).not.toHaveBeenCalled();
  });

  it('should report the error and reject without updating the state when the request fails', async () => {
    const { toggleFavoriteThunk } = await import('./toggleFavoriteThunk');
    const { storageActions } = await import('app/store/slices/storage');
    const { setItemFavorite } = await import('../services');
    const errorService = (await import('services/error.service')).default;

    const requestError = new Error('Network error');
    vi.mocked(setItemFavorite).mockRejectedValue(requestError);

    const result = await toggleFavoriteThunk([buildItem()])(dispatch, getState, undefined);

    expect(errorService.reportError).toHaveBeenCalledWith(requestError);
    expect(result.meta.requestStatus).toBe('rejected');
    expect(storageActions.addFavorites).not.toHaveBeenCalled();
    expect(storageActions.removeFavorites).not.toHaveBeenCalled();
  });
});

describe('toggleFavoriteThunkExtraReducers', () => {
  it('should show an error toast when the thunk is rejected', async () => {
    const { toggleFavoriteThunkExtraReducers } = await import('./toggleFavoriteThunk');
    const notificationsService = (await import('app/notifications/services/notifications.service')).default;

    const callbacks: Array<(state: StorageState, action: { payload?: unknown }) => void> = [];
    const builder = {
      addCase: vi.fn().mockImplementation((_, callback) => {
        if (callback) callbacks.push(callback);
        return builder;
      }),
    } as unknown as ActionReducerMapBuilder<StorageState>;

    toggleFavoriteThunkExtraReducers(builder);

    expect(builder.addCase).toHaveBeenCalledTimes(1);

    callbacks[0]({} as StorageState, {});
    expect(notificationsService.show).toHaveBeenCalled();
  });
});
