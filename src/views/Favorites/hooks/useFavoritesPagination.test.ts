import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { storageActions } from 'app/store/slices/storage';
import { useFavoritesPagination } from './useFavoritesPagination';

const mockDispatch = vi.fn();
let mockStorageState: { hasMoreFavoriteFolders: boolean; hasMoreFavoriteFiles: boolean };

vi.mock('app/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: (state: unknown) => unknown) => selector({ storage: mockStorageState }),
}));

describe('useFavoritesPagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorageState = { hasMoreFavoriteFolders: true, hasMoreFavoriteFiles: true };
  });

  test('When the store reports more favorites to load, then the hook exposes both flags', () => {
    mockStorageState = { hasMoreFavoriteFolders: true, hasMoreFavoriteFiles: false };

    const { result } = renderHook(() => useFavoritesPagination());

    expect(result.current.hasMoreFavoriteFolders).toBe(true);
    expect(result.current.hasMoreFavoriteFiles).toBe(false);
  });

  test('When fetchFavorites is called, then the favorites thunk is dispatched', () => {
    const { result } = renderHook(() => useFavoritesPagination());

    result.current.fetchFavorites();

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(expect.any(Function));
  });

  test('When resetFavoritesPagination is called, then the reset action is dispatched', () => {
    const { result } = renderHook(() => useFavoritesPagination());

    result.current.resetFavoritesPagination();

    expect(mockDispatch).toHaveBeenCalledWith(storageActions.resetFavoritesPagination());
  });
});
